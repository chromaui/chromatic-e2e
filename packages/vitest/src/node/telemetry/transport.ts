import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { TELEMETRY_FETCH_TIMEOUT_MS } from "./constants";
import type { WireTelemetryEvent } from "./types";

/** Built `dist/telemetry-sender.mjs`, or `sender.ts` when running from source. */
const SENDER_PATH = fileURLToPath(
  new URL(
    import.meta.url.endsWith(".ts") ? "./sender.ts" : "./telemetry-sender.mjs",
    import.meta.url,
  ),
);

export interface TelemetryTransport {
  /** Hand the event over to the background sender process. Never throws. */
  send(message: { endpoint: string; event: WireTelemetryEvent }): void;

  /** Resolves once all events are handed over to the sender. Does not wait for the HTTP responses. */
  close(): Promise<void>;
}

/**
 * Send telemetry events from a detached child process, so that Vitest doesn't need to wait for the
 * telemetry endpoint to respond before it can exit.
 */
export function createTelemetryTransport(): TelemetryTransport {
  const child = spawn(process.execPath, [SENDER_PATH, String(TELEMETRY_FETCH_TIMEOUT_MS)], {
    // Own process group, so that Ctrl+C on Vitest doesn't kill pending requests
    detached: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
    windowsHide: true,
  });

  // Telemetry errors are ignored, e.g. when the process cannot be spawned
  child.on("error", () => {});

  // Neither the child process nor the IPC channel should keep Vitest alive
  child.unref();
  child.channel?.unref();

  const pending = new Set<Promise<void>>();

  return {
    send(message) {
      if (!child.connected) {
        return;
      }

      const promise = new Promise<void>((resolve) => {
        try {
          // Callback is called once the message has been written to the IPC channel, or on failure
          child.send(message, () => resolve());
        } catch {
          resolve();
        }
      });

      pending.add(promise);
      void promise.finally(() => pending.delete(promise));
    },

    async close() {
      // Wait for all messages to be handed over, not for the HTTP requests themselves
      await Promise.all(pending);

      // Signals the child that no more events are coming. It exits once its requests have settled.
      if (child.connected) {
        child.disconnect();
      }
    },
  };
}
