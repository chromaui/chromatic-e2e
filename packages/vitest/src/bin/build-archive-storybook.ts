#!/usr/bin/env node

import { buildArchiveStorybook } from '@chromatic-com/shared-e2e/archive-storybook';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';
import path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../constants';
import { type EventType, type TelemetryEvent, trackCliEvent } from '../node/telemetry';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = path.resolve(import.meta.dirname, '../storybook-config');

let queue = Promise.resolve();

try {
  trackEvent({
    eventType: 'storybook_build_started',
    level: 'info',
    payload: {
      // chromatic cli sets `STORYBOOK_INVOKED_BY=chromatic`
      isCalledFromCLI: process.env.STORYBOOK_INVOKED_BY === 'chromatic',
    },
  });

  await buildArchiveStorybook(args, configDir, DEFAULT_OUTPUT_DIR, { onArchivesCheck });

  trackEvent({
    eventType: 'storybook_build_completed',
    level: 'info',
    payload: { success: true, error: undefined },
  });
} catch (err) {
  trackEvent({
    eventType: 'storybook_build_completed',
    level: 'error',
    payload: { success: false, error: err },
  });

  // Throwing the error results in a large output of minified code and a stacktrace that is
  // likely not helpful to users, so this should hide the noise.

  console.error(err.message);
  process.exitCode = 1;
}

await queue;

function trackEvent<T extends EventType = EventType>(event: TelemetryEvent<T>) {
  queue = queue.then(() =>
    trackCliEvent(event, { outputDirectory: path.dirname(archivesDir(DEFAULT_OUTPUT_DIR)) }).catch(
      () => {} // Ignore telemetry errors
    )
  );
}

function onArchivesCheck(error?: unknown) {
  trackEvent({
    eventType: 'archives_resolved',
    level: error ? 'error' : 'info',
    payload: {
      success: error == undefined,
      isCustomLocation: process.env.CHROMATIC_ARCHIVE_LOCATION != undefined,
      command: 'buildArchiveStorybook',
    },
  });
}
