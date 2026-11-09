#!/usr/bin/env node

import path from "node:path";

import { DEFAULT_PORT, startArchiveStorybook } from "@chromatic-com/shared-e2e/archive-storybook";
import { DEV_COMMAND, runCommand } from "@chromatic-com/shared-e2e/archive-storybook/cli";
import { archivesDir } from "@chromatic-com/shared-e2e/utils/filePaths";

import { DEFAULT_OUTPUT_DIR } from "../constants";
import { type EventType, type TelemetryEvent, trackCliEvent } from "../node/telemetry";

let queue = Promise.resolve();

// Discard first two entries (exec path and file path)
await runCommand(DEV_COMMAND, process.argv.slice(2), async (options, logger) => {
  trackEvent({ eventType: "storybook_dev_started", level: "info", payload: {} });

  try {
    await startArchiveStorybook(
      {
        storybookDir: path.resolve(import.meta.dirname, "../storybook-static"),
        defaultOutputDir: DEFAULT_OUTPUT_DIR,
        port: options.port ?? DEFAULT_PORT,
        strictPort: options.port !== undefined,
        host: options.host,
        logger,
      },
      { onArchivesCheck },
    );
  } catch (error) {
    trackEvent({ eventType: "storybook_dev_failed", level: "error", payload: { error } });

    throw error;
  }
});

await queue;

function trackEvent<T extends EventType = EventType>(event: TelemetryEvent<T>) {
  queue = queue.then(() =>
    trackCliEvent(event, { outputDirectory: path.dirname(archivesDir(DEFAULT_OUTPUT_DIR)) }).catch(
      () => {}, // Ignore telemetry errors
    ),
  );
}

function onArchivesCheck(error?: unknown) {
  trackEvent({
    eventType: "archives_resolved",
    level: error ? "error" : "info",
    payload: {
      success: error == undefined,
      error,
      isCustomLocation: process.env.CHROMATIC_ARCHIVE_LOCATION != undefined,
      command: "archiveStorybook",
      chromaticProjectId: undefined,
    },
  });
}
