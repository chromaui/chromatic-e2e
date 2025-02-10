import type { Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import type { serializedNodeWithId } from '@chromaui/rrweb-snapshot';
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
  const domSnapshot: serializedNodeWithId = await page.evaluate(dedent`
    ${rrweb};

    // this code was erroring the page.evaluate() when it was passed as a function to page.evaluate(),
    // so for now it is being passed as a string until that can be resolved.
    const doPostProcessing = (rrwebSnapshotInstance, documentToSnapshot) => {
      return new Promise((resolve) => {
        const domSnapshot = rrwebSnapshotInstance.snapshot(documentToSnapshot);
        // do some post-processing on the snapshot
        const toDataURL = async (url) => {
          // read contents of the blob URL
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolveFileRead, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolveFileRead(reader.result);
            reader.onerror = reject;
            // convert the blob to base64 string
            reader.readAsDataURL(blob);
          });
        };

        const replaceBlobUrls = async (node) => {
          await Promise.all(
            node.childNodes.map(async (childNode) => {
              if (childNode.tagName === 'img' && childNode.attributes.src?.startsWith('blob:')) {
                const base64Url = await toDataURL(childNode.attributes.src);
                // eslint-disable-next-line no-param-reassign
                childNode.attributes.src = base64Url;
              }

              if (childNode.childNodes?.length) {
                await replaceBlobUrls(childNode);
              }
            })
          );
        };

        replaceBlobUrls(domSnapshot).then(() => {
          resolve(domSnapshot);
        });
      });
    };

    // page.evaluate returns the value of the function being evaluated. In this case, it means that
    // it is returning either the resolved value of the Promise or the return value of the call to
    // the snapshot function. See https://playwright.dev/docs/api/class-page#page-evaluate.
    if (typeof define === 'function' && define.amd) {
      // AMD support is detected, so we need to load rrwebSnapshot asynchronously
      new Promise((resolve) => {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        require(['rrwebSnapshot'], (rrwebSnapshot) => {
          doPostProcessing(rrwebSnapshot, document).then((domSnapshot) => {
            resolve(domSnapshot);
          });
        });
      });
    } else {
      new Promise((resolve) => {
        doPostProcessing(rrwebSnapshot, document).then((domSnapshot) => {
          resolve(domSnapshot);
        });    
      });
    }    
  `);

  await page.evaluate(() => {
    console.log('blarb');
  });

  const bufferedSnapshot = Buffer.from(JSON.stringify(domSnapshot));
  if (!chromaticSnapshots.has(testId)) {
    // map used so the snapshots are always in order
    chromaticSnapshots.set(testId, new Map());
  }
  chromaticSnapshots.get(testId).set(name, bufferedSnapshot);
}

export { takeSnapshot };
