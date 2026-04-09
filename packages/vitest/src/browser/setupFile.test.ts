import { expect, test, vi } from 'vitest';
import { type TestModule } from 'vitest/node';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../test/utils/node';

/** See {@link file://./../../test/fixtures/tags.test.ts} */
const include = ['tags.test.ts'];
const tags = [
  { name: 'example-1' },
  { name: 'example-2' },
  { name: 'example-3' },
  { name: 'example-4' },
  { name: 'example-5' },
];

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('by default all tests are snapshotted', async () => {
  await runFixture({ include, tags });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #2",
      "test #3",
      "test #4",
      "test #5",
    ]
  `);
});

test("does not require user to define Vitest's tags", async () => {
  await runFixture({ include }, { tags: tags.map((tag) => tag.name) });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #2",
      "test #3",
      "test #4",
    ]
  `);
});

test('works even if user defines their own custom Vitest tags', async () => {
  await runFixture(
    { include, tags: [{ name: 'custom-tag', description: 'custom desc' }] },
    { tags: tags.map((tag) => tag.name) }
  );

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #2",
      "test #3",
      "test #4",
    ]
  `);
});

test("no tests are snapshotted when tag doesn't match any", async () => {
  await runFixture({ include, tags }, { tags: ['example-5'] });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
});

test('snapshots tests matching a single tag', async () => {
  await runFixture({ include, tags }, { tags: ['example-1'] });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
    ]
  `);
});

test('snapshots tests matching multiple tags', async () => {
  await runFixture({ include, tags }, { tags: ['example-1', 'example-2'] });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #2",
    ]
  `);
});

test('snapshots tests matching tag of describe()', async () => {
  await runFixture({ include, tags }, { tags: ['example-3'] });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #3",
      "test #4",
    ]
  `);
});

test('snapshots tests matching tag of nested describe()', async () => {
  await runFixture({ include, tags }, { tags: ['example-4'] });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #3",
    ]
  `);
});

test('cleans up internal test meta properties', async () => {
  const testModules: TestModule[] = [];

  await runFixture(
    {
      include,
      tags,
      reporters: [{ onTestRunEnd: (results) => void testModules.push(...results) }],
    },
    { tags: ['example-1', 'example-2'] }
  );

  const tests = testModules.flatMap((testModule) => Array.from(testModule.children.allTests()));
  const metas = tests.map((testCase) => testCase.meta());

  expect(metas).toMatchInlineSnapshot(`
    [
      {},
      {},
      {},
      {},
      {},
    ]
  `);
});

function getSnapshottedTests() {
  return vi.mocked(shared.writeTestResult).mock.calls.map((call) => {
    return call[0].titlePath.pop();
  });
}
