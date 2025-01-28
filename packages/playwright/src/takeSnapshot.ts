import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import type { elementNode } from '@chromaui/rrweb-snapshot';
import { logger } from '@chromatic-com/shared-e2e';

const rrweb = readFileSync(require.resolve('@chromaui/rrweb-snapshot'), 'utf8');

// top-level key is the test ID, next level key is the name of the snapshot (which we expect to be unique)
export const chromaticSnapshots: Map<string, Map<string, Buffer>> = new Map();

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
    const number = chromaticSnapshots.has(testId) ? chromaticSnapshots.get(testId).size + 1 : 1;
    name = `Snapshot #${number}`;
  }

  page.on('console', (msg) => {
    logger.log(`CONSOLE: "${msg.text()}"`);
  });

  // Serialize and capture the DOM
  const domSnapshot: elementNode = await page.evaluate(dedent`
    ${rrweb};
    // page.evaluate returns the value of the function being evaluated. In this case, it means that
    // it is returning either the resolved value of the Promise or the return value of the call to
    // the snapshot function. See https://playwright.dev/docs/api/class-page#page-evaluate.
    if (typeof define === "function" && define.amd) {
      // AMD support is detected, so we need to load rrwebSnapshot asynchronously
      new Promise((resolve) => {
        require(['rrwebSnapshot'], (rrwebSnapshot) => {
          resolve(rrwebSnapshot.snapshot(document));
        });
      });
    } else {
      const snapshot = rrwebSnapshot.snapshot(document);
      
      // within the snapshot, find any blob URLs and write them to disk
      
      
      return snapshot;
    }
  `);

  const bufferedSnapshot = Buffer.from(JSON.stringify(domSnapshot));
  if (!chromaticSnapshots.has(testId)) {
    // map used so the snapshots are always in order
    chromaticSnapshots.set(testId, new Map());
  }
  chromaticSnapshots.get(testId).set(name, bufferedSnapshot);
}

export { takeSnapshot };
