#!/usr/bin/env node

import path from "node:path";

import { DEFAULT_PORT, startArchiveStorybook } from "@chromatic-com/shared-e2e/archive-storybook";
import { DEV_COMMAND, runCommand } from "@chromatic-com/shared-e2e/archive-storybook/cli";

import { DEFAULT_OUTPUT_DIR } from "../constants";

// Discard first two entries (exec path and file path)
await runCommand(DEV_COMMAND, process.argv.slice(2), async (options, logger) => {
  await startArchiveStorybook({
    storybookDir: path.resolve(import.meta.dirname, "../storybook-static"),
    defaultOutputDir: DEFAULT_OUTPUT_DIR,
    port: options.port ?? DEFAULT_PORT,
    strictPort: options.port !== undefined,
    host: options.host,
    logger,
  });
});
