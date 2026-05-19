import { describe, expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../../test/utils/node';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

describe('configure({ disableAutoSnapshot })', () => {
  /** See {@link file://./../../../test/fixtures/disable-autosnapshot.test.ts} */
  const include = ['disable-autosnapshot.test.ts'];

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

  test('{ disableAutoSnapshot: true } on module level affects all tests', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'module' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
  });

  test('{ disableAutoSnapshot: true } on suite level', async () => {
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

  test('{ disableAutoSnapshot: true } on nested suite level', async () => {
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

  test('{ disableAutoSnapshot: true } on test level', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'test' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
  });

  test('{ disableAutoSnapshot: true } on a single test', async () => {
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
});

function getSnapshottedTests() {
  return vi.mocked(shared.writeTestResult).mock.calls.map((call) => {
    return call[0].titlePath.pop();
  });
}
