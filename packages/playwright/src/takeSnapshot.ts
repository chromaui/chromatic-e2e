import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import type { elementNode } from 'rrweb-snapshot';
import { logger } from '@chromatic-com/shared-e2e';

const rrweb = readFileSync(require.resolve('rrweb-snapshot/dist/rrweb-snapshot.js'), 'utf8');

export const contentType = 'application/rrweb.snapshot+json';

export const chromaticSnapshots: Record<string, [{ name: string; snapshot: string }]> = {};

async function takeSnapshot(page: Page, testInfo: TestInfo): Promise<void>;
async function takeSnapshot(page: Page, name: string, testInfo: TestInfo): Promise<void>;
async function takeSnapshot(
  page: Page,
  nameOrTestInfo: string | TestInfo,
  maybeTestInfo?: TestInfo
): Promise<void> {
  let name: string;
  let testInfo: TestInfo;
  let testId: string;
  if (typeof nameOrTestInfo === 'string') {
    if (!maybeTestInfo) throw new Error('Incorrect usage');
    testInfo = maybeTestInfo;
    testId = maybeTestInfo.testId;
    name = nameOrTestInfo;
  } else {
    testInfo = nameOrTestInfo;
    testId = nameOrTestInfo.testId;
    // const number = testInfo.attachments.filter((a) => a.contentType === contentType).length + 1;
    const number = chromaticSnapshots[testId] ? chromaticSnapshots[testId].length + 1 : 1;
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

  testInfo.attach(name, { contentType, body: JSON.stringify(domSnapshot) });
  const snapshotEntry = { name, snapshot: JSON.stringify(domSnapshot) };
  if (!chromaticSnapshots[testId]) {
    chromaticSnapshots[testId] = [snapshotEntry];
  } else {
    chromaticSnapshots[testId].push(snapshotEntry);
  }
}

export { takeSnapshot };
