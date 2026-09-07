import { expect, test } from "vitest";

import { isVitest5, runFixture } from "../../../test/utils/node";

/** See {@link file://./../../../test/fixtures/wait-for-idle-network.test.ts} */
const include = ["wait-for-idle-network.test.ts"];

test("throws when used in a test that isn't registered", async () => {
  const { stderr } = await runFixture(
    {
      include,
      provide: { testName: "one" },
    },
    { disabled: true },
  );

  if (isVitest5()) {
    expect(stderr).toMatchInlineSnapshot(`
      "
      ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

       FAIL   chromium  wait-for-idle-network.test.ts > test #1
      TypeError: waitForIdleNetwork() cannot be called in a test that is not registered for Chromatic plugin.
      Make sure chromium project has chromaticPlugin() enabled.
       ❯ wait-for-idle-network.test.ts:10:9
            8|   document.body.innerHTML = "<h1>Example heading</h1>";
            9|
           10|   await waitForIdleNetwork(1);
             |         ^
           11|
           12|   expect.fail("Should not reach this point");

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
    `);
  } else {
    expect(stderr).toMatchInlineSnapshot(`
      "
      ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

       FAIL   chromium  wait-for-idle-network.test.ts > test #1
      TypeError: waitForIdleNetwork() cannot be called in a test that is not registered for Chromatic plugin.
      Make sure chromium project has chromaticPlugin() enabled.
       ❯ wait-for-idle-network.test.ts:10:8
            8|   document.body.innerHTML = "<h1>Example heading</h1>";
            9|
           10|   await waitForIdleNetwork(1);
             |        ^
           11|
           12|   expect.fail("Should not reach this point");

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
    `);
  }
});

test("throws when used outside of a test()", async () => {
  const { stderr } = await runFixture({
    include,
    provide: { testName: "two" },
  });

  if (isVitest5()) {
    expect(stderr).toMatchInlineSnapshot(`
      "
      ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

       FAIL   chromium  wait-for-idle-network.test.ts > suite
      TypeError: waitForIdleNetwork() must be called within a test()
       ❯ wait-for-idle-network.test.ts:17:11
           15| describe.runIf(inject("testName") === "two")("suite", async () => {
           16|   beforeAll(async () => {
           17|     await waitForIdleNetwork(1);
             |           ^
           18|   });
           19|

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
    `);
  } else {
    expect(stderr).toMatchInlineSnapshot(`
      "
      ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

       FAIL   chromium  wait-for-idle-network.test.ts > suite
      TypeError: waitForIdleNetwork() must be called within a test()
       ❯ wait-for-idle-network.test.ts:17:10
           15| describe.runIf(inject("testName") === "two")("suite", async () => {
           16|   beforeAll(async () => {
           17|     await waitForIdleNetwork(1);
             |          ^
           18|   });
           19|

      ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
    `);
  }
});
