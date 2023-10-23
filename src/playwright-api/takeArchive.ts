import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import type { elementNode, serializedNodeWithId } from '@chromaui/rrweb-snapshot';

import dedent from 'ts-dedent';

import { SourceMapper } from '../utils/source-mapper';
import { logger } from '../utils/logger';

const rrweb = readFileSync(
  require.resolve('@chromaui/rrweb-snapshot/dist/rrweb-snapshot.js'),
  'utf8'
);

export const contentType = 'application/rrweb.snapshot+json';

async function takeArchive(page: Page, testInfo: TestInfo): Promise<Map<string, string>>;
async function takeArchive(
  page: Page,
  name: string,
  testInfo: TestInfo
): Promise<Map<string, string>>;
async function takeArchive(
  page: Page,
  nameOrTestInfo: string | TestInfo,
  maybeTestInfo?: TestInfo
): Promise<Map<string, string>> {
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
    rrwebSnapshot.snapshot(document, { noAbsolute: true });
  `);

  // XXX_jwir3: We go through and filter any of these that would have file names that would be too long.
  //            This is limited to 250 bytes. Technically, the file system is limited to 256 bytes, but
  //            this gives us 5 bytes for a period and four characters, in the event that we want to
  //            add a file extension.
  const sourceMapper: SourceMapper = new SourceMapper(domSnapshot);
  const sourceMap = sourceMapper.shortenFileNamesLongerThan(250).build();

  testInfo.attach(name, { contentType, body: JSON.stringify(domSnapshot) });

  return Promise.resolve(sourceMap);
}

export { takeArchive };
