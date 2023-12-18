import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import type { elementNode } from 'rrweb-snapshot';

import dedent from 'ts-dedent';

import { logger } from '../../packages/shared/src/utils/logger';

const rrweb = readFileSync(require.resolve('rrweb-snapshot/dist/rrweb-snapshot.js'), 'utf8');

export const contentType = 'application/rrweb.snapshot+json';

async function takeArchive(page: Page, testInfo: TestInfo): Promise<void>;
async function takeArchive(page: Page, name: string, testInfo: TestInfo): Promise<void>;
async function takeArchive(
  page: Page,
  nameOrTestInfo: string | TestInfo,
  maybeTestInfo?: TestInfo
): Promise<void> {
  let name: string;
  let testInfo: TestInfo;
  if (typeof nameOrTestInfo === 'string') {
    if (!maybeTestInfo) throw new Error('Incorrect usage');
    testInfo = maybeTestInfo;
    name = nameOrTestInfo;
  } else {
    testInfo = nameOrTestInfo;
    const number = testInfo.attachments.filter((a) => a.contentType === contentType).length + 1;
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
}

export { takeArchive };
