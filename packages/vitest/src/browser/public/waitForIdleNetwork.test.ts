import { expect, test } from 'vitest';
import { runFixture } from '../../../test/utils/node';

/** See {@link file://./../../../test/fixtures/wait-for-idle-network.test.ts} */
const include = ['wait-for-idle-network.test.ts'];

test("throws when used in a test that isn't registered", async () => {
  const { stderr } = await runFixture(
    {
      include,
      provide: { testName: 'one' },
    },
    { disabled: true }
  );

  expect(stderr).toMatchInlineSnapshot(`
    "
    ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

     FAIL   chromium  wait-for-idle-network.test.ts > test #1
    TypeError: waitForIdleNetwork() cannot be called in a test that is not registered for Chromatic plugin.
    Make sure chromium project has chromaticPlugin() enabled.
     ❯ wait-for-idle-network.test.ts:9:8
          7|   document.body.innerHTML = '<h1>Example heading</h1>';
          8|
          9|   await waitForIdleNetwork(1);
           |        ^
         10|
         11|   expect.fail('Should not reach this point');

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
  `);
});

test('throws when used outside of a test()', async () => {
  const { stderr } = await runFixture({
    include,
    provide: { testName: 'two' },
  });

  expect(stderr).toMatchInlineSnapshot(`
    "
    ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

     FAIL   chromium  wait-for-idle-network.test.ts > suite
    TypeError: waitForIdleNetwork() must be called within a test()
     ❯ wait-for-idle-network.test.ts:16:10
         14| describe.runIf(inject('testName') === 'two')('suite', async () => {
         15|   beforeAll(async () => {
         16|     await waitForIdleNetwork(1);
           |          ^
         17|   });
         18|

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
  `);
});
