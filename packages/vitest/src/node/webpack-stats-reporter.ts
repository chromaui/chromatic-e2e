import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import type { TestCase, TestModule, Vite, Vitest } from 'vitest/node';
import type { Reporter } from 'vitest/reporters';
import type { ResolvedOptions } from '../types';

const REPORTER_NAME = 'chromatic-webpack-stats-reporter';

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
      const dependencies = [...storyFiles];

      // Test module also depends on Vitest config
      if (testModule.project.config.config) {
        dependencies.push(testModule.project.config.config);
      }

      statsMap.set(id, this.createStatsMapModule(id, dependencies));

      this.addModule(testModule.moduleId, statsMap, vite.moduleGraph);
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
    moduleGraph: Vite.ModuleGraph
  ) {
    const mod = moduleGraph.getModuleById(id);

    if (!mod) {
      throw new Error(`Could not find module for id ${id}`);
    }

    for (const imported of mod.importedModules) {
      if (!imported.id.includes(this.ctx.config.root) || imported.id.includes('node_modules')) {
        continue;
      }

      this.addModule(imported.id, statsMap, moduleGraph);

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
