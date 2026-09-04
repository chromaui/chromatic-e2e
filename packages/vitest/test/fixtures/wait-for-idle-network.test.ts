import { http } from "msw";
import { setupWorker } from "msw/browser";
import { beforeAll, describe, expect, test, inject, onTestFinished } from "vitest";

import { waitForIdleNetwork } from "../../src";

test.runIf(inject("testName") === "one")("test #1", async () => {
  document.body.innerHTML = "<h1>Example heading</h1>";

  await waitForIdleNetwork(1);

  expect.fail("Should not reach this point");
});

describe.runIf(inject("testName") === "two")("suite", async () => {
  beforeAll(async () => {
    await waitForIdleNetwork(1);
  });

  test("test #2", async () => {});
});

test.runIf(inject("testName") === "three")("test #3", async () => {
  const worker = setupWorker();
  await worker.start({ quiet: true });
  onTestFinished(() => void worker.stop());

  const onRequest = new Promise((resolve) =>
    worker.use(http.get("/example", () => new Promise(resolve))),
  );

  const controller = new AbortController();
  void fetch("/example", { signal: controller.signal }).catch(() => {});
  await onRequest;

  await waitForIdleNetwork(2).catch(() => controller.abort());
});
