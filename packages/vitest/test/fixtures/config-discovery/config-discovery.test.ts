import { test } from "vitest";

import { configure, takeSnapshot } from "../../../src";

configure({ disableAutoSnapshot: true });

test("config discovery test", async () => {
  document.body.innerHTML = "<p>Hello world</p>";

  await takeSnapshot("snapshot");
});
