import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import type { elementNode, serializedNodeWithId } from '@chromaui/rrweb-snapshot';
import { NodeType } from '@chromaui/rrweb-snapshot';

import dedent from 'ts-dedent';

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

  // XXX_jwir3: We go through and filter any of these that would have file names that would be too large.
  const sourceMap: Map<string, string> = new Map<string, string>();
  if (domSnapshot.childNodes.length !== 0) {
    shortenFileNameSrc(domSnapshot.childNodes, sourceMap);
  }

  testInfo.attach(name, { contentType, body: JSON.stringify(domSnapshot) });

  return Promise.resolve(sourceMap);
}

function shortenFileNameSrc(
  input: Array<serializedNodeWithId>,
  existingSourceMap: Map<string, string>
): Map<string, string> {
  // eslint-disable-next-line no-restricted-syntax
  for (const nextChildNode of input) {
    if ('attributes' in nextChildNode && 'src' in nextChildNode.attributes) {
      const stringBuffer = Buffer.from(nextChildNode.attributes.src as string);
      if (stringBuffer.length > 250) {
        const shortName: string = stringBuffer.toString('utf-8', 0, 250);
        logger.log(`Filename '${stringBuffer}' is too long. Shortening to '${shortName}'`);
        existingSourceMap.set(stringBuffer.toString('utf-8'), shortName);
      }
    }

    if (nextChildNode.type === NodeType.Element) {
      const childElementNode: elementNode = nextChildNode as elementNode;

      if (childElementNode.childNodes.length !== 0) {
        shortenFileNameSrc(childElementNode.childNodes, existingSourceMap);
      }
    }
  }

  return existingSourceMap;
}

export { takeArchive };
