/**
 * Entry point of the detached child process that sends telemetry events in the background.
 * See {@link file://./transport.ts} for the parent side.
 *
 * Events are received over IPC from the Vitest process. The IPC channel keeps this process alive
 * until the parent disconnects or exits. After that only pending requests keep the event loop
 * running, and the process exits once they have settled.
 *
 * Keep this file free of imports: during development it's run directly with Node's type stripping.
 */

export {};

const timeout = Number(process.argv[2]);

process.on("message", (message) => {
  const { endpoint, event } = message as { endpoint: string; event: unknown };

  fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(timeout),
  }).catch(() => {});
});
