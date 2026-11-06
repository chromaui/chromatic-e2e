#!/usr/bin/env node

import path from "node:path";

import { buildArchiveStorybook } from "@chromatic-com/shared-e2e/archive-storybook";
import { BUILD_COMMAND, runCommand } from "@chromatic-com/shared-e2e/archive-storybook/cli";

import { DEFAULT_OUTPUT_DIR } from "../constants";
import { addViewportsToStoriesFiles } from "./set-viewports";

// Discard first two entries (exec path and file path)
await runCommand(BUILD_COMMAND, process.argv.slice(2), async (options, logger) => {
  // When Playright projects are used, they override each others *.stories.json files. Re-apply viewports based on generated archives.
  // Proper fix would be to prefix each *.stories.json file with the project name (like Vitest integration does), but that's breaking change.
  await addViewportsToStoriesFiles();

  await buildArchiveStorybook({
    storybookDir: path.resolve(import.meta.dirname, "../storybook-static"),
    defaultOutputDir: DEFAULT_OUTPUT_DIR,
    outputDir: options.outputDir,
    statsDir: options.statsDir,
    logger,
  });
});
