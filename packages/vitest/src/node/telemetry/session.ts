import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

import type { Vitest } from "vitest/node";

import { TELEMETRY_LOG_FILE, TELEMETRY_METADATA_FILE } from "./constants";
import type { TelemetryMetadata } from "./metadata";
import type { TelemetryTransport } from "./transport";

/** @internal */
export const session = {
  id: randomUUID() as string,
  projectId: undefined as string | undefined,
  chromaticVersion: undefined as string | undefined,

  /**
   * Directories used by `telemetry.logToFile`.
   * Held in session to avoid race conditions when Vitest projects are used.
   * Multiple projects could try to clean up the same directory while other one is writing there already.
   */
  cleanedLogFileDirectories: new Set<string>(),

  /** Promises to wait before Vitest exists */
  cleanups: new Set<Promise<void>>(),

  /** Background process sending the events. Created lazily on first event. */
  transport: undefined as TelemetryTransport | undefined,

  /** Whether cleanup hooks were already registered for this session */
  cleanupRegistered: false,

  /** Whether internal `.vitest/chromatic/telemetry-metadata.json` has been written */
  isMetadataWritten: false,

  /** Contents of `.vitest/chromatic/telemetry-metadata.json` */
  telemetryMetadata: undefined as undefined | TelemetryMetadata,
};

/**
 * Delete the telemetry log files just once per session
 */
export function cleanTelemetryLogFiles(outputDirectory: string): void {
  if (session.cleanedLogFileDirectories.has(outputDirectory)) {
    return;
  }
  session.cleanedLogFileDirectories.add(outputDirectory);

  rmSync(resolve(outputDirectory, TELEMETRY_LOG_FILE), { force: true });
  rmSync(resolve(outputDirectory, TELEMETRY_METADATA_FILE), { force: true });
}

/**
 * Wait until all pending events are handed over to the background process, then disconnect from it.
 * Doesn't wait for the events to be sent.
 */
export async function flushTelemetry(): Promise<void> {
  await Promise.all(Array.from(session.cleanups.values()));
  session.cleanups.clear();

  await session.transport?.close();
  session.transport = undefined;
}

/**
 * Register a cleanup handler to run all pending telemetry cleanups on Vitest exit.
 */
export function setupTelemetryCleanup(vitest: Vitest) {
  if (session.cleanupRegistered) {
    return;
  }

  session.cleanupRegistered = true;

  vitest.onClose(async () => {
    await flushTelemetry();

    session.isMetadataWritten = false;
    session.cleanedLogFileDirectories.clear();
    session.cleanupRegistered = false;
  });
}
