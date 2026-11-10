import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

import { expect, onTestFinished, test, vi } from "vitest";

import type * as Transport from "./transport";

// Global test setup mocks the transport, this test validates the real one
const { createTelemetryTransport } = await vi.importActual<typeof Transport>("./transport");

test("sends events from background process", async () => {
  const { endpoint, requests } = await startServer((_req, res) => res.end("ok"));

  const transport = createTelemetryTransport();
  transport.send({ endpoint, event: { id: "first" } as any });
  transport.send({ endpoint, event: { id: "second" } as any });

  await transport.close();

  await vi.waitFor(() => expect(requests.map((r) => r.id).toSorted()).toEqual(["first", "second"]));
});

test("close() does not wait for telemetry endpoint to respond", async () => {
  // Endpoint never responds
  const { endpoint, requests } = await startServer(() => {});

  const transport = createTelemetryTransport();
  transport.send({ endpoint, event: { id: "first" } as any });

  // Would hang until test timeout if responses were awaited
  await expect(transport.close()).resolves.not.toThrow();

  // Child process keeps sending after parent has disconnected
  await vi.waitFor(() => expect(requests.map((r) => r.id)).toEqual(["first"]));
});

test("send() after close() is ignored", async () => {
  const { endpoint, requests } = await startServer((_req, res) => res.end("ok"));

  const transport = createTelemetryTransport();
  transport.send({ endpoint, event: { id: "first" } as any });

  await expect(transport.close()).resolves.not.toThrow();
  expect(() => transport.send({ endpoint, event: { id: "second" } as any })).not.toThrow();

  await vi.waitFor(() => expect(requests.map((r) => r.id)).toEqual(["first"]));
});

async function startServer(handler: (req: IncomingMessage, res: ServerResponse) => void) {
  const requests: { id: string }[] = [];

  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;

    requests.push(JSON.parse(body));
    handler(req, res);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  onTestFinished(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });

  const { port } = server.address() as AddressInfo;

  return { endpoint: `http://127.0.0.1:${port}/telemetry/v1/vitest/events`, requests };
}
