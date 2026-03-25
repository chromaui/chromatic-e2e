import { expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../../test/utils/node';

/** See {@link file://./../../../test/fixtures/disable-autosnapshot.test.ts} */
const include = ['disable-autosnapshot.test.ts'];

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('by default does not disable anything', async () => {
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

test('disableAutoSnapshot() on module level affects all tests', async () => {
  await runFixture({
    include,
    provide: { disableAutoSnapshot: 'module' },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
});

test('disableAutoSnapshot() on suite level', async () => {
  await runFixture({
    include,
    provide: { disableAutoSnapshot: 'describe' },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #5",
    ]
  `);
});

test('disableAutoSnapshot() on nested suite level', async () => {
  await runFixture({
    include,
    provide: { disableAutoSnapshot: 'describe-nested' },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #2",
      "test #4",
      "test #5",
    ]
  `);
});

test('disableAutoSnapshot() on test level', async () => {
  await runFixture({
    include,
    provide: { disableAutoSnapshot: 'test' },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
});

test('disableAutoSnapshot() on a single test', async () => {
  await runFixture({
    include,
    provide: { disableAutoSnapshot: 'test-second' },
  });

  expect(getSnapshottedTests()).toMatchInlineSnapshot(`
    [
      "test #1",
      "test #3",
      "test #4",
      "test #5",
    ]
  `);
});

function getSnapshottedTests() {
  return vi.mocked(shared.writeTestResult).mock.calls.map((call) => {
    return call[0].titlePath.pop();
  });
}
