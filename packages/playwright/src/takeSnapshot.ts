import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import type { elementNode } from 'rrweb-snapshot';
import { logger } from '@chromatic-com/shared-e2e';

const rrweb = readFileSync(require.resolve('rrweb-snapshot/dist/rrweb-snapshot.js'), 'utf8');

// top-level key is the test ID, next level key is the name of the snapshot (which we expect to be unique)
export const chromaticSnapshots: Record<string, Map<string, Buffer>> = {};

async function takeSnapshot(page: Page, testInfo: TestInfo): Promise<void>;
async function takeSnapshot(page: Page, name: string, testInfo: TestInfo): Promise<void>;
async function takeSnapshot(
  page: Page,
  nameOrTestInfo: string | TestInfo,
  maybeTestInfo?: TestInfo
): Promise<void> {
  let name: string;
  let testId: string;
  if (typeof nameOrTestInfo === 'string') {
    if (!maybeTestInfo) throw new Error('Incorrect usage');
    testId = maybeTestInfo.testId;
    name = nameOrTestInfo;
  } else {
    testId = nameOrTestInfo.testId;
    const number = chromaticSnapshots[testId]
      ? Object.keys(chromaticSnapshots[testId]).length + 1
      : 1;
    name = `Snapshot #${number}`;
  }

  page.on('console', (msg) => {
    logger.log(`CONSOLE: "${msg.text()}"`);
  });

  // Serialize and capture the DOM
  const domSnapshot: elementNode = await page.evaluate(dedent`
    ${rrweb};
    rrwebSnapshot.snapshot(document);
  `);

  const bufferedSnapshot = Buffer.from(JSON.stringify(domSnapshot));
  if (!chromaticSnapshots[testId]) {
    // map used so the snapshots are always in order
    chromaticSnapshots[testId] = new Map();
  }
  chromaticSnapshots[testId].set(name, bufferedSnapshot);
}

export { takeSnapshot };
