import { expect, test, vi } from 'vitest';
import { type TestModule } from 'vitest/node';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../test/utils/node';

/** See {@link file://./../../test/fixtures/tags.test.ts} */
const include = ['tags.test.ts'];

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('by default all tests are snapshotted', async () => {
  await runFixture({ include });

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

test('cleans up internal test meta properties', async () => {
  const testModules: TestModule[] = [];

  await runFixture({
    include,
    reporters: [{ onTestRunEnd: (results) => void testModules.push(...results) }],
  });

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
