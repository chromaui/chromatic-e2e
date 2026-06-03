import { expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../test/utils/node';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('writes test results with full test name', async () => {
  /** See {@link file://./../../test/fixtures/test-names.test.ts} */
  await runFixture({ include: ['test-names.test.ts'] });

  const tests = vi
    .mocked(shared.writeTestResult)
    .mock.calls.map((call) => [...call[0].titlePath, ...Object.keys(call[1])]);

  expect(tests).toMatchInlineSnapshot(`
    [
      [
        "test-names",
        "test #1 / Snapshot #1",
      ],
      [
        "test-names",
        "suite #2 / test #2 / Snapshot #1",
      ],
      [
        "test-names",
        "suite #3 / nested suite #3 / test #3 / Snapshot #1",
      ],
    ]
  `);
});

test('writes test title without extensions', async () => {
  /** See {@link file://./../../test/fixtures/nested/directories/expected-name.this-should-be-ignored.and-this.test.ts} */
  await runFixture({
    include: ['nested/directories/expected-name.this-should-be-ignored.and-this.test.ts'],
  });

  expect(shared.writeTestResult).toHaveBeenCalledTimes(1);

  const call = vi.mocked(shared.writeTestResult).mock.calls[0];
  const titlePath = call[0].titlePath;

  expect(titlePath).toMatchInlineSnapshot(`
    [
      "nested/directories/expected-name",
    ]
  `);
});

test('writes test results with DOM snapshot', async () => {
  /** See {@link file://./../../test/fixtures/dom.test.ts} */
  await runFixture({ include: ['dom.test.ts'] });

  const snapshots = vi.mocked(shared.writeTestResult).mock.calls.map((call) => call[1]);

  expect(snapshots[0]).toHaveProperty('mount some elements / Snapshot #1');

  const { snapshot } = snapshots[0]['mount some elements / Snapshot #1'];
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

test('writes test results with custom parameters', async () => {
  /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
  await runFixture({ include: ['take-snapshot.test.ts'], provide: { testName: 'five' } });

  const snapshots = vi.mocked(shared.writeTestResult).mock.calls.map((call) => call[1]);
  const parameters = snapshots
    .map((snapshot) => Object.values(snapshot).map((s) => s.parameters.chromatic.vitest))
    .flat();

  expect(parameters).toMatchInlineSnapshot(`
    [
      {
        "snapshot": "Named snapshot #1",
        "suites": [
          "suite #2",
          "suite #3",
          "suite #4",
        ],
        "test": "test #5",
      },
      {
        "snapshot": "Named snapshot #2",
        "suites": [
          "suite #2",
          "suite #3",
          "suite #4",
        ],
        "test": "test #5",
      },
      {
        "snapshot": "Snapshot #3",
        "suites": [
          "suite #2",
          "suite #3",
          "suite #4",
        ],
        "test": "test #5",
      },
      {
        "snapshot": "Snapshot #1",
        "suites": [
          "suite #2",
          "suite #3",
        ],
        "test": "test #6",
      },
      {
        "snapshot": "Snapshot #2",
        "suites": [
          "suite #2",
          "suite #3",
        ],
        "test": "test #6",
      },
    ]
  `);
});
