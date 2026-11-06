import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { archivesDir as resolveArchivesDir, checkArchivesDirExists } from "../utils/filePaths";
import { STORIES_FILE_EXT } from "../write-archive/stories-files";
import { generateStoryIndex } from "../write-archive/story-index";
import type { Logger } from "./cli";

const STATS_FILE = "preview-stats.json";

/** Prebuilt files that the archives must not override, like with Storybook's `staticDirs` */
const RESERVED_FILES = ["index.html", "iframe.html"];

interface Options {
  /** Prebuilt Storybook shipped in the package's `dist/storybook-static` */
  storybookDir: string;

  /** The package's default directory for test results, overridden by `CHROMATIC_ARCHIVE_LOCATION` */
  defaultOutputDir: string;

  /** Directory where to store built files, relative to project root */
  outputDir: string;

  /** Directory where to write `preview-stats.json`, relative to project root */
  statsDir?: string;

  logger: Logger;
}

interface Callbacks {
  onArchivesCheck?: (error?: unknown) => void;
}

/**
 * Builds the archive Storybook without running Storybook:
 *
 * 1. Copies the prebuilt Storybook into the output directory
 * 2. Copies the `*.stories.json` files and the archived snapshots and assets next to it
 * 3. Generates `index.json` from the `*.stories.json` files
 * 4. Copies `preview-stats.json` of the Vitest stats reporter for TurboSnap
 */
export async function buildArchiveStorybook(
  options: Options,
  callbacks?: Callbacks,
): Promise<void> {
  const { logger } = options;
  const projectRoot = process.cwd();
  const archivesDir = resolveArchivesDir(options.defaultOutputDir);
  const outputDir = path.resolve(projectRoot, options.outputDir);

  try {
    checkArchivesDirExists(archivesDir);
    callbacks?.onArchivesCheck?.();
  } catch (error) {
    callbacks?.onArchivesCheck?.(error);
    throw error;
  }

  assertSafeOutputDir({ outputDir, projectRoot, archivesDir });

  logger.info(`Building Storybook from ${path.relative(projectRoot, archivesDir)}`);

  logger.debug(`Cleaning output directory ${outputDir}`);
  await rm(outputDir, { recursive: true, force: true });

  logger.debug(`Copying prebuilt Storybook from ${options.storybookDir}`);
  await cp(options.storybookDir, outputDir, { recursive: true });

  await copyArchives({ archivesDir, outputDir, logger });

  const index = await generateStoryIndex({ archivesDir, projectRoot });
  await writeFile(path.join(outputDir, "index.json"), JSON.stringify(index));
  logger.info(`Generated index.json with ${Object.keys(index.entries).length} stories`);

  if (options.statsDir) {
    await writeStats({
      // The Vitest stats reporter writes next to the archives directory
      source: path.join(path.dirname(archivesDir), STATS_FILE),
      target: path.join(path.resolve(projectRoot, options.statsDir), STATS_FILE),
      logger,
    });
  }

  logger.output(`Output directory: ${outputDir}`);
}

/**
 * Archives are copied after the prebuilt Storybook, so they win on collisions like with Storybook's
 * `staticDirs`. Story files are copied flat next to `iframe.html`, where the runtime `importFn`
 * fetches them from.
 */
async function copyArchives(options: { archivesDir: string; outputDir: string; logger: Logger }) {
  const { archivesDir, outputDir, logger } = options;

  const storiesFiles = await readdir(archivesDir).then((files) =>
    files.filter((filename) => filename.endsWith(STORIES_FILE_EXT)),
  );

  for (const filename of storiesFiles) {
    await cp(path.join(archivesDir, filename), path.join(outputDir, filename));
  }

  logger.debug(`Copied ${storiesFiles.length} stories files`);

  const assetsDir = path.join(archivesDir, "archive");
  const reservedFiles = RESERVED_FILES.map((filename) => path.join(outputDir, filename));

  if (existsSync(assetsDir)) {
    await cp(assetsDir, outputDir, {
      recursive: true,
      filter: (_, destination) => !reservedFiles.includes(destination),
    });

    logger.debug(`Copied snapshots and assets from ${assetsDir}`);
  }
}

/**
 * Chromatic CLI passes `--stats-json` when TurboSnap is enabled, and fails when the stats file is
 * missing. Write an empty stats file when the Vitest stats reporter didn't write one, so that Chromatic
 * CLI explains why TurboSnap can't be used instead of reporting a missing file.
 */
async function writeStats(options: { source: string; target: string; logger: Logger }) {
  const { source, target, logger } = options;

  await mkdir(path.dirname(target), { recursive: true });

  if (existsSync(source)) {
    await cp(source, target);
    logger.debug(`Copied ${source} to ${target}`);
  } else {
    await writeFile(target, JSON.stringify({ modules: [] }));
    logger.debug(`No ${source} found, wrote empty ${target}`);
  }
}

/** The output directory is removed before building, so it must not contain the project or archives */
function assertSafeOutputDir(options: {
  outputDir: string;
  projectRoot: string;
  archivesDir: string;
}) {
  const { outputDir, projectRoot, archivesDir } = options;

  if (isSameOrParent(outputDir, projectRoot)) {
    throw new Error(`Won't remove project directory '${outputDir}'. Check your --output-dir!`);
  }

  if (isSameOrParent(outputDir, archivesDir)) {
    throw new Error(
      `Won't remove directory '${outputDir}', it contains the archives in '${archivesDir}'. Check your --output-dir!`,
    );
  }
}

function isSameOrParent(directory: string, child: string) {
  const relative = path.relative(directory, child);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}
