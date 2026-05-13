import { beforeEach, describe, expect, it } from 'vitest';
import { TestInfo } from 'playwright/test';
import { Page } from 'playwright';
import { NodeType, serializedElementNodeWithId } from '@rrweb/types';
import { chromaticSnapshots, takeSnapshot } from './takeSnapshot';

// @ts-expect-error fakePage isn't a proper page, but we just need to fake enough to run the test
// (where page is probably too tied up into takeSnapshot anyway)
const fakePage = {
  on: () => {},
  evaluate: () => ({ domSnapshot: {}, pseudoClassIds: {} }),
  viewportSize: () => ({ width: 100, height: 200 }),
  frames: () => [],
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
    expect(Buffer.isBuffer(chromaticSnapshots.get('a').get('Snapshot #1')?.snapshot)).toBe(true);
    expect(chromaticSnapshots.get('a').get('Snapshot #1')?.viewport).toEqual({
      width: 100,
      height: 200,
    });
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

  it('captures iframe contents', async () => {
    const iframes: serializedElementNodeWithId[] = [
      {
        type: NodeType.Element,
        tagName: 'iframe',
        attributes: { src: 'https://example1.com' },
        childNodes: [],
        id: 2,
      },
      {
        type: NodeType.Element,
        tagName: 'iframe',
        attributes: { src: 'https://example2.com' },
        childNodes: [],
        id: 3,
      },
    ];

    const pageWithIframes = {
      on: () => {},
      evaluate: () => ({
        domSnapshot: {
          type: NodeType.Document,
          childNodes: [{ type: NodeType.Element, tagName: 'html', childNodes: iframes, id: 1 }],
          id: 0,
        },
        pseudoClassIds: {},
      }),
      viewportSize: () => ({ width: 100, height: 200 }),
      frames: () => [
        fakePage,
        {
          evaluate: () => ({
            domSnapshot: { type: NodeType.Element, tagName: 'div', textContent: 'One', id: 10 },
            pseudoClassIds: { ':hover': [10] },
          }),
          url: () => iframes[0].attributes.src,
        },
        {
          evaluate: () => ({
            domSnapshot: { type: NodeType.Element, tagName: 'span', textContent: 'Two', id: 20 },
            pseudoClassIds: { ':focus': [20] },
          }),
          url: () => iframes[1].attributes.src,
        },
      ],
    } as unknown as Page;

    const fakeTestInfo = { testId: 'multi-iframe-test' };
    await takeSnapshot(pageWithIframes, fakeTestInfo as TestInfo);

    expect(chromaticSnapshots.get('multi-iframe-test').has('Snapshot #1')).toBe(true);
    const snapshot = chromaticSnapshots.get('multi-iframe-test').get('Snapshot #1')?.snapshot;
    const parsedSnapshot = JSON.parse(snapshot!.toString());

    const capturedIframes = parsedSnapshot.childNodes[0].childNodes;
    expect(capturedIframes.length).toBe(2);

    expect(capturedIframes[0].tagName).toBe('iframe');
    expect(capturedIframes[0].contentDocument?.tagName).toBe('div');
    expect(capturedIframes[0].contentDocument?.textContent).toBe('One');
    expect(capturedIframes[0].pseudoClassIds).toEqual({ ':hover': [10] });

    expect(capturedIframes[1].tagName).toBe('iframe');
    expect(capturedIframes[1].contentDocument?.tagName).toBe('span');
    expect(capturedIframes[1].contentDocument?.textContent).toBe('Two');
    expect(capturedIframes[1].pseudoClassIds).toEqual({ ':focus': [20] });
  });
});
