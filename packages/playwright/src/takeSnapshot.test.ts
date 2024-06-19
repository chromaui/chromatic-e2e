import { TestInfo } from 'playwright/test';
import { Page } from 'playwright';
import { chromaticSnapshots, takeSnapshot } from './takeSnapshot';

// @ts-expect-error fakePage isn't a proper page, but we just need to fake enough to run the test
// (where page is probably too tied up into takeSnapshot anyway)
const fakePage = {
  on: () => {},
  // @ts-expect-error return type of evaluate isn't a concern to us here as we test
  // in the Chromatic snapshots that the snapshot actually captures what we want
  evaluate: () => null,
} as Page;

describe('Snapshot storage', () => {
  beforeEach(async () => {
    // we have to manually clear out the chromaticSnapshots entries since that behavior only happens
    // in our test fixture (one level up).
    chromaticSnapshots.clear();
  });

  it('creates an entry (test name and snapshot buffer) when a snapshot is taken', async () => {
    expect(chromaticSnapshots.size).toBe(0);

    // not ideal to mock testInfo, but AFAIK we can't get testInfo when using Playwright library instead of Playwright test runner.
    // and this way we can specify the test ID ourselves
    const fakeTestInfo = { testId: 'a' };
    await takeSnapshot(fakePage, fakeTestInfo as TestInfo);

    expect(chromaticSnapshots.get('a').has('Snapshot #1')).toBe(true);
    expect(Buffer.isBuffer(chromaticSnapshots.get('a').get('Snapshot #1'))).toBe(true);
  });

  it('creates multiple entries when multiple snapshots are taken', async () => {
    expect(chromaticSnapshots.size).toBe(0);

    const fakeTestInfo = { testId: 'a' };
    // take multiple snapshots
    await takeSnapshot(fakePage, fakeTestInfo as TestInfo);
    await takeSnapshot(fakePage, fakeTestInfo as TestInfo);

    expect(chromaticSnapshots.get('a').has('Snapshot #1')).toBe(true);
    expect(chromaticSnapshots.get('a').has('Snapshot #2')).toBe(true);
  });

  it('preserves names of snapshots when provided', async () => {
    expect(chromaticSnapshots.size).toBe(0);

    const fakeTestInfo = { testId: 'a' };
    await takeSnapshot(fakePage, 'first snappy', fakeTestInfo as TestInfo);
    await takeSnapshot(fakePage, 'second snappy', fakeTestInfo as TestInfo);

    expect(chromaticSnapshots.get('a').has('first snappy')).toBe(true);
    expect(chromaticSnapshots.get('a').has('second snappy')).toBe(true);
  });
});
