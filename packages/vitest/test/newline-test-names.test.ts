import { describe } from "vitest";

import { configure, takeSnapshot } from "../dist";
import { test } from "./utils/browser";

describe(`
Test
name
newlines
`, () => {
  test.override({ url: "/test-server-root" });

  test("Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r", async () => {});

  test("newlines in snapshot name", async () => {
    configure({ disableAutoSnapshot: true });

    await takeSnapshot("snapshot name\nwith newlines\r\nand carriage returns");
  });
});
