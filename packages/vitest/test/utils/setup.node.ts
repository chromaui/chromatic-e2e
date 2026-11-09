import { vi } from "vitest";

/**
 * Send telemetry from the test process instead of a background child process,
 * so that `msw` can intercept the requests. Closing waits for all responses so tests can assert requests deterministically.
 * The real transport is tested in {@link file://./../../src/node/telemetry/transport.test.ts}
 */
vi.mock(import("../../src/node/telemetry/transport"), () => ({
  createTelemetryTransport() {
    const pending = new Set<Promise<unknown>>();

    return {
      send({ endpoint, event }) {
        const promise = fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(5_000),
        })
          .catch(() => {})
          .finally(() => pending.delete(promise));

        pending.add(promise);
      },

      async close() {
        await Promise.all(pending);
      },
    };
  },
}));
