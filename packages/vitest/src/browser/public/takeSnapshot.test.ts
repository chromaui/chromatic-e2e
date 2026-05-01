import { expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { getBrowserConfig, runFixture } from '../../../test/utils/node';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

/** See {@link file://./../../../test/fixtures/take-snapshot.test.ts} */
const takeSnapshotTest = 'take-snapshot.test.ts';

/** See {@link file://./../../../test/fixtures/viewports.test.ts} */
const viewportsTest = 'viewports.test.ts';

test('provides descriptive error when called in non-registered test', async () => {
  const { stderr } = await runFixture(
    {
      include: [takeSnapshotTest],
      provide: { testName: 'one' },
    },
    { disabled: true }
  );

  expect(stderr).toMatchInlineSnapshot(`
    "
    ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

     FAIL   chromium  take-snapshot.test.ts > test #1
    TypeError: takeSnapshot() cannot be called in a test that is not registered for Chromatic plugin.
    Make sure chromium project has chromaticPlugin() enabled.
     ❯ take-snapshot.test.ts:7:8
          5|   document.body.innerHTML = '<h1>Example heading</h1>';
          6|
          7|   await takeSnapshot();
           |        ^
          8|
          9|   expect.fail('Should not reach this point');

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
  `);
});

test('provides descriptive error when called outside of a test()', async () => {
  const { stderr } = await runFixture({
    include: [takeSnapshotTest],
    provide: { testName: 'two' },
  });

  expect(stderr).toMatchInlineSnapshot(`
    "
    ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

     FAIL   chromium  take-snapshot.test.ts > suite
    TypeError: takeSnapshot() must be called within a test()
     ❯ take-snapshot.test.ts:14:10
         12| describe.runIf(inject('testName') === 'two')('suite', async () => {
         13|   beforeAll(async () => {
         14|     await takeSnapshot();
           |          ^
         15|   });
         16|

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯"
  `);
});

test('provides descriptive error when not awaited', async () => {
  const { stderr } = await runFixture({
    include: [takeSnapshotTest],
    provide: { testName: 'three' },
  });

  expect(stderr).toMatchInlineSnapshot(`
    "
    ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

     FAIL   chromium  take-snapshot.test.ts > test #3
    Error: takeSnapshot() call was not awaited!
     ❯ take-snapshot.test.ts:23:2
         21|   document.body.innerHTML = '<h1>Example heading</h1>';
         22|
         23|   takeSnapshot(); // Leave the promise floating, no await
           |  ^
         24|
         25|   // another

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

     FAIL   chromium  take-snapshot.test.ts > test #3
    Error: takeSnapshot() call was not awaited!
     ❯ take-snapshot.test.ts:26:2
         24|
         25|   // another
         26|   takeSnapshot();
           |  ^
         27| });
         28|

    ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯"
  `);
});

test('viewports are correct when --browser.ui=true', async () => {
  await runFixture({
    include: [viewportsTest],
    browser: { ...getBrowserConfig(), ui: true, viewport: { width: 1280, height: 720 } },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    {
      "calls page.viewport multiple times in one test": {
        "1280 x 1024": "width=1280, height=1024",
        "480 x 320": "width=480, height=320",
        "720 x 680": "width=720, height=680",
        "Snapshot #4": "width=1280, height=1024",
      },
      "calls page.viewport(480, 320)": {
        "Snapshot #1": "width=480, height=320",
      },
      "default viewport": {
        "Snapshot #1": "width=1280, height=720",
      },
    }
  `);
});

test('viewports are correct when --browser.ui=false', async () => {
  await runFixture({
    include: [viewportsTest],
    browser: { ...getBrowserConfig(), ui: false, viewport: { width: 1280, height: 720 } },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    {
      "calls page.viewport multiple times in one test": {
        "1280 x 1024": "width=1280, height=1024",
        "480 x 320": "width=480, height=320",
        "720 x 680": "width=720, height=680",
        "Snapshot #4": "width=1280, height=1024",
      },
      "calls page.viewport(480, 320)": {
        "Snapshot #1": "width=480, height=320",
      },
      "default viewport": {
        "Snapshot #1": "width=1280, height=720",
      },
    }
  `);
});

test.each(['list', 'stack'] as const)(
  "autosnapshot is taken before user registered afterEach runs when {sequence.hooks: '%s'}",
  async (hooks) => {
    await runFixture({
      include: [takeSnapshotTest],
      provide: { testName: 'four' },
      setupFiles: ['custom-setup-file.ts'],
      sequence: { hooks },
    });

    expect(shared.writeTestResult).toHaveBeenCalledTimes(1);

    const [, snapshots] = vi.mocked(shared.writeTestResult).mock.calls[0];
    expect(snapshots).toHaveProperty('Snapshot #1');

    const { snapshot } = snapshots['Snapshot #1'];

    expect(JSON.parse(snapshot.toString())).toMatchInlineSnapshot(`
    {
      "attributes": {},
      "childNodes": [
        {
          "id": "number",
          "textContent": "Example heading",
          "type": 3,
        },
      ],
      "id": "number",
      "tagName": "h1",
      "type": 2,
    }
  `);
  }
);

test("warns when {sequence.hooks: 'parallel'} is used", async () => {
  const { stderr } = await runFixture({
    include: [takeSnapshotTest],
    provide: { testName: 'four' },
    setupFiles: ['custom-setup-file.ts'],
    sequence: { hooks: 'parallel' },
  });

  expect(shared.writeTestResult).toHaveBeenCalledTimes(1);

  expect(stderr).toMatchInlineSnapshot(
    `" chromatic  Using { sequence.hooks: 'parallel' } may cause unstable snapshots. Please set 'sequence.hooks' to 'list' or 'stack' to ensure reliable snapshot ordering."`
  );
});

function getSnapshottedTests() {
  return vi.mocked(shared.writeTestResult).mock.calls.reduce((all, call) => {
    const [e2eTestInfo, domSnapshots] = call;
    const title = e2eTestInfo.titlePath.pop()!;

    const snapshots = Object.fromEntries(
      Object.entries(domSnapshots).map(([name, { viewport }]) => [
        name,
        `width=${viewport.width}, height=${viewport.height}`,
      ])
    );

    return { ...all, [title]: snapshots };
  }, {});
}
