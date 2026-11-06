#!/usr/bin/env node

import path from "node:path";

import { buildArchiveStorybook } from "@chromatic-com/shared-e2e/archive-storybook";
import { BUILD_COMMAND, runCommand } from "@chromatic-com/shared-e2e/archive-storybook/cli";
import { archivesDir } from "@chromatic-com/shared-e2e/utils/filePaths";

import { DEFAULT_OUTPUT_DIR } from "../constants";
import {
  type EventType,
  flushTelemetry,
  type TelemetryEvent,
  trackCliEvent,
} from "../node/telemetry";

// These environment variables are set by chromatic-cli:
const isCalledFromCLI = process.env.STORYBOOK_INVOKED_BY === "chromatic";
const chromaticProjectId = process.env.CHROMATIC_PROJECT_ID || "unknown";

let queue = Promise.resolve();

// Discard first two entries (exec path and file path)
await runCommand(BUILD_COMMAND, process.argv.slice(2), async (options, logger) => {
  trackEvent({
    eventType: "storybook_build_started",
    level: "info",
    payload: { isCalledFromCLI, chromaticProjectId },
  });

  try {
    await buildArchiveStorybook(
      {
        storybookDir: path.resolve(import.meta.dirname, "../storybook-static"),
        defaultOutputDir: DEFAULT_OUTPUT_DIR,
        outputDir: options.outputDir,
        statsDir: options.statsDir,
        logger,
      },
      { onArchivesCheck },
    );
  } catch (error) {
    trackEvent({
      eventType: "storybook_build_completed",
      level: "error",
      payload: { success: false, error, chromaticProjectId },
    });

    throw error;
  }

  trackEvent({
    eventType: "storybook_build_completed",
    level: "info",
    payload: { success: true, error: undefined, chromaticProjectId },
  });
});

await queue;
await flushTelemetry().catch(() => {});

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
      command: "buildArchiveStorybook",
      chromaticProjectId,
    },
  });
}
