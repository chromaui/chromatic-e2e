import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import type { elementNode } from 'rrweb-snapshot';
import { logger } from '@chromatic-com/shared-e2e';

const rrweb = readFileSync(require.resolve('rrweb-snapshot/dist/rrweb-snapshot.js'), 'utf8');

// top-level key is the test ID, next level key is the name of the snapshot (which we expect to be unique)
export const chromaticSnapshots: Map<string, Map<string, Buffer>> = new Map();

async function takeSnapshot(page: Page, testInfo: TestInfo): Promise<Buffer>;
async function takeSnapshot(page: Page, name: string, testInfo: TestInfo): Promise<Buffer>;
async function takeSnapshot(
  page: Page,
  nameOrTestInfo: string | TestInfo,
  maybeTestInfo?: TestInfo
): Promise<Buffer> {
  let name: string;
  let testId: string;
  if (typeof nameOrTestInfo === 'string') {
    if (!maybeTestInfo) throw new Error('Incorrect usage');
    testId = maybeTestInfo.testId;
    name = nameOrTestInfo;
  } else {
    testId = nameOrTestInfo.testId;
    const number = chromaticSnapshots.has(testId) ? chromaticSnapshots.get(testId).size + 1 : 1;
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
  if (!chromaticSnapshots.has(testId)) {
    // map used so the snapshots are always in order
    chromaticSnapshots.set(testId, new Map());
  }
  chromaticSnapshots.get(testId).set(name, bufferedSnapshot);

  return bufferedSnapshot;
}

export { takeSnapshot };
