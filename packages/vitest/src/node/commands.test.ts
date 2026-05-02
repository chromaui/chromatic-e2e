import { expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../test/utils/node';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('writes test results with full test name', async () => {
  /** See {@link file://./../../test/fixtures/test-names.test.ts} */
  await runFixture({ include: ['test-names.test.ts'] });

  const titlePaths = vi.mocked(shared.writeTestResult).mock.calls.map((call) => call[0].titlePath);

  expect(titlePaths).toMatchInlineSnapshot(`
    [
      [
        "test-names.test.ts",
        "test #1",
      ],
      [
        "test-names.test.ts",
        "suite #2",
        "test #2",
      ],
      [
        "test-names.test.ts",
        "suite #3",
        "nested suite #3",
        "test #3",
      ],
    ]
  `);
});

test('can group named snapshots by test', async () => {
  /** See {@link file://./../../test/fixtures/test-names.test.ts} */
  await runFixture({ include: ['test-names.test.ts'] }, { groupSnapshotsByTest: true });

  const titlePaths = vi.mocked(shared.writeTestResult).mock.calls.map((call) => call[0].titlePath);

  expect(titlePaths).toMatchInlineSnapshot(`
    [
      [
        "test-names -> test #1",
      ],
      [
        "test-names -> suite #2 / test #2",
      ],
      [
        "test-names -> suite #3 / nested suite #3 / test #3",
      ],
    ]
  `);
});

test('writes test results with DOM snapshot', async () => {
  /** See {@link file://./../../test/fixtures/dom.test.ts} */
  await runFixture({ include: ['dom.test.ts'] });

  const snapshots = vi.mocked(shared.writeTestResult).mock.calls.map((call) => call[1]);

  expect(snapshots[0]).toHaveProperty('Snapshot #1');

  const { snapshot } = snapshots[0]['Snapshot #1'];
  const json = JSON.parse(Buffer.from(snapshot).toString());

  expect(json).toMatchInlineSnapshot(`
    [
      {
        "attributes": {},
        "childNodes": [
          {
            "id": "number",
            "textContent": "Heading",
            "type": 3,
          },
        ],
        "id": "number",
        "tagName": "h2",
        "type": 2,
      },
      {
        "attributes": {},
        "childNodes": [
          {
            "id": "number",
            "textContent": "Button",
            "type": 3,
          },
        ],
        "id": "number",
        "tagName": "button",
        "type": 2,
      },
    ]
  `);
});
