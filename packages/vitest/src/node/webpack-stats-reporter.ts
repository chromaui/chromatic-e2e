import { existsSync, readFileSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import type { TestCase, TestModule, Vite, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import type { ResolvedOptions } from '../types';

const REPORTER_NAME = 'chromatic-webpack-stats-reporter';
const VIRTUAL_MODULE_PREFIX = '\0';

interface Options {
  /** Full resolved path to the `preview-stats.json` file */
  outputFile: string;
}

/** Path to a Story file, for example `.vitest/chromatic/chromatic-archives/test-button-2.stories.json` */
type StoryFilePath = string;

/** See https://github.com/chromaui/chromatic-cli/blob/145a5e295dde21042e96396c7e004f250d842182/bin-src/types.ts#L265-L276 */
export interface Module {
  id: string;
  name: string;
  reasons: { moduleName: string }[];
}

/**
 * Custom Vitest test reporter to write `preview-stats.json` file for TurboSnap
 */
export class WebpackStatsReporter implements Reporter {
  public name = REPORTER_NAME;

  private constructor(
    private ctx: Vitest,
    private options: Options,
    private moduleIdsToStoryFiles = new Map<TestModule['moduleId'], Set<StoryFilePath>>()
  ) {}

  /**
   * Add `WebpackStatsReporter` to Vitest reporters unless it's already included.
   */
  static apply(ctx: Vitest, pluginOptions: ResolvedOptions) {
    const exists = ctx.config.reporters.some(isWebpackStatsReporter);

    if (!exists) {
      const outputFile = resolve(
        ctx.config.root,
        pluginOptions.outputDirectory,
        'preview-stats.json'
      );

      ctx.config.reporters.push(new WebpackStatsReporter(ctx, { outputFile }));
    }
  }

  /**
   * Custom reporter life-cycle called when `*.stories.json` is written to file system.
   */
  static onStoryFileWrite(ctx: Vitest, testCase: TestCase, storyFilePath: StoryFilePath) {
    const reporter = ctx.config.reporters.find(isWebpackStatsReporter);

    reporter?._onStoryFileWrite(testCase, storyFilePath);
  }

  /**
   * Collect Story files written per each test module during test run
   */
  private _onStoryFileWrite(testCase: TestCase, storyFilePath: StoryFilePath) {
    const moduleId = testCase.module.moduleId;

    let entry = this.moduleIdsToStoryFiles.get(moduleId);

    if (!entry) {
      entry = new Set<StoryFilePath>();
      this.moduleIdsToStoryFiles.set(moduleId, entry);
    }

    entry.add(storyFilePath);
  }

  async onTestRunStart() {
    await rm(this.options.outputFile, { force: true });

    this.moduleIdsToStoryFiles.clear();
  }

  /**
   * Generate `preview-stats.json` from collected Story files and their dependent test modules
   */
  async onTestRunEnd(testModules: TestModule[]) {
    const statsMap = new Map<Module['id'], Module>();

    for (const testModule of testModules) {
      const storyFiles = this.moduleIdsToStoryFiles.get(testModule.moduleId);

      // onTestRunEnd will contain all projects, even the JSDOM tests. These test modules don't have stories written.
      if (!storyFiles || storyFiles.size === 0) {
        continue;
      }

      const vite = testModule.project.browser?.vite;

      // This is more of a typescript required check at this point
      if (!vite) {
        continue;
      }

      const id = this.normalize(testModule.moduleId);

      // Test module is imported by all its story files
      statsMap.set(id, this.createStatsMapModule(id, [...storyFiles]));

      // Test module also depends on Vitest config
      if (testModule.project.config.config) {
        const configId = this.normalize(testModule.project.config.config);
        const configEntry = statsMap.get(configId) || this.createStatsMapModule(configId, []);

        configEntry.reasons.push({ moduleName: id });
        statsMap.set(configId, configEntry);
      }

      this.addModule(testModule.moduleId, statsMap, vite.moduleGraph, vite.config.cacheDir);
    }

    if (!existsSync(dirname(this.options.outputFile))) {
      await mkdir(dirname(this.options.outputFile), { recursive: true });
    }

    await writeFile(
      this.options.outputFile,
      JSON.stringify({ modules: Array.from(statsMap.values()) }, null, 2),
      'utf-8'
    );
  }

  private addModule(
    id: Vite.ModuleNode['id'],
    statsMap: Map<Module['id'], Module>,
    moduleGraph: Vite.ModuleGraph,
    cacheDir: Vite.UserConfig['cacheDir'],
    visited = new Set<Vite.ModuleNode['id']>()
  ) {
    if (visited.has(id)) {
      return;
    }
    visited.add(id);

    const mod = moduleGraph.getModuleById(id);

    if (!mod) {
      return this.ctx.logger.error(
        `[chromatic] Could not find module for id ${id}. Excluding from TurboSnap.`
      );
    }

    const importedModules: { id: string; isInModuleGraph?: boolean }[] = [];

    for (const imported of mod.importedModules) {
      // File-only entries have no `id`, e.g. Sass partials and CSS `@import`s
      if (imported.id == null) {
        if (imported.file) {
          importedModules.push({ id: imported.file, isInModuleGraph: false });
        }
        continue;
      }

      const isOptimizedDependency = imported.id.startsWith(cacheDir);

      if (!isOptimizedDependency) {
        importedModules.push({ id: imported.id, isInModuleGraph: true });
        continue;
      }

      // It's optimized dependency, remap it back to sources.
      // Do not include the optimized dependency entry itself.
      importedModules.push(...resolveOptimizedDependencySources(imported, cacheDir, visited));
    }

    for (const imported of importedModules) {
      // Skip virtual modules
      if (imported.id.startsWith(VIRTUAL_MODULE_PREFIX)) {
        continue;
      }

      if (imported.isInModuleGraph) {
        this.addModule(imported.id, statsMap, moduleGraph, cacheDir, visited);
      }

      const depId = this.normalize(imported.id);
      const entry = statsMap.get(depId);

      if (!entry) {
        statsMap.set(depId, this.createStatsMapModule(depId, [mod.id]));
        continue;
      }

      const moduleName = this.normalize(mod.id);

      if (!entry.reasons.find((reason) => reason.moduleName === moduleName)) {
        entry.reasons.push({ moduleName });
      }
    }
  }

  private createStatsMapModule(filename: string, importers: string[]): Module {
    return {
      id: filename,
      name: filename,
      reasons: importers.map((importer) => ({ moduleName: this.normalize(importer) })),
    };
  }

  private normalize(filePath: string) {
    return (
      relative(this.ctx.config.root, filePath)
        // Windows \\ to /
        .replaceAll(sep, '/')
        // Remove query parameters to make filenames comparable against git
        .split('?')[0]
    );
  }
}

function isWebpackStatsReporter(
  reporter: Vitest['config']['reporters'][number]
): reporter is WebpackStatsReporter {
  return 'name' in reporter && reporter.name === REPORTER_NAME;
}

/**
 * Resolve an optimized dependency chunk back to the source files it was bundled from.
 *
 * @example
 * ```
 * Input: `node_modules/.vite/vitest/<hash>/deps/some-dependency.js`
 *
 * Output:
 * - `node_modules/some-dependency/dist/index.js`
 * - `node_modules/some-dependency/dist/something.js`
 * - `node_modules/transitive-dependency-of-some-dependency/dist/index.js`
 * - `node_modules/transitive-dependency-of-some-dependency/dist/something-more.js`
 * ```
 */
function resolveOptimizedDependencySources(
  mod: Vite.ModuleNode,
  cacheDir: Vite.UserConfig['cacheDir'],
  visited: Set<Vite.ModuleNode['id']>
): { id: string; isInModuleGraph: boolean }[] {
  if (visited.has(mod.id)) {
    return [];
  }
  visited.add(mod.id);

  const sources = getChunkSources(mod, cacheDir).map((id) => ({
    id,

    // These entries are not in module graph as they were bundled
    isInModuleGraph: false,
  }));

  for (const imported of mod.importedModules) {
    // File-only entries have no `id`, fall back to their file path
    if (imported.id == null) {
      if (imported.file) {
        sources.push({ id: imported.file, isInModuleGraph: false });
      }
      continue;
    }

    if (imported.id.startsWith(VIRTUAL_MODULE_PREFIX)) {
      continue;
    }

    if (imported.id.startsWith(cacheDir)) {
      sources.push(...resolveOptimizedDependencySources(imported, cacheDir, visited));
    } else {
      // Module externalized from the bundle, e.g. `vitest` itself. It's a real
      // module graph node, so it will be traversed normally.
      sources.push({ id: imported.id, isInModuleGraph: true });
    }
  }

  return sources;
}

function getChunkSources(mod: Vite.ModuleNode, cacheDir: Vite.UserConfig['cacheDir']) {
  const sources = resolveMapSources(mod, mod.transformResult?.map, cacheDir);

  if (sources.length) {
    return sources;
  }

  // Transform result doesn't always hold a source map.
  // Fallback to check if file system has one.
  try {
    const diskMap = JSON.parse(readFileSync(`${mod.id.split('?')[0]}.map`, 'utf-8'));

    return resolveMapSources(mod, diskMap, cacheDir);
  } catch {
    return [];
  }
}

function resolveMapSources(
  mod: Vite.ModuleNode,
  map: unknown,
  cacheDir: Vite.UserConfig['cacheDir']
): string[] {
  if (!map || typeof map !== 'object' || !('sources' in map) || !Array.isArray(map.sources)) {
    return [];
  }

  return map.sources.flatMap((source) => {
    if (typeof source !== 'string' || source.startsWith(VIRTUAL_MODULE_PREFIX)) {
      return [];
    }

    const resolved = resolve(dirname(mod.id), source).replaceAll(sep, '/');

    // Sources must point outside the cache directory — e.g. an identity
    // sourcemap points the chunk back at itself, which is not a real source
    if (resolved.startsWith(cacheDir)) {
      return [];
    }

    return [resolved];
  });
}
