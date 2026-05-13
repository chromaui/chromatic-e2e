import type { Frame, Page, TestInfo } from '@playwright/test';
import { readFileSync } from 'fs';
import { dedent } from 'ts-dedent';
import { NodeType, type serializedNodeWithId } from '@rrweb/types';
import { type DOMSnapshots, type SerializedIframeNode, logger } from '@chromatic-com/shared-e2e';

const rrweb = readFileSync(require.resolve('@chromaui/rrweb-snapshot'), 'utf8');

type TestID = TestInfo['testId'];
type SnapshotName = keyof DOMSnapshots;
export const chromaticSnapshots: Map<
  TestID,
  Map<SnapshotName, DOMSnapshots[SnapshotName]>
> = new Map();

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
  const { domSnapshot, pseudoClassIds } = await executeSnapshotScript(page);

  // First iframe is the main document, skip it.
  // This returns all iframes, even the nested ones.
  const iframes = page.frames().slice(1);

  if (iframes.length > 0) {
    const iframeNodes: SerializedIframeNode[] = findIframes(domSnapshot);
    const usedIndexes = new Set<number>();

    for (const [index, iframe] of iframes.entries()) {
      const node =
        // Prefer iframe with matching URL
        filterIframes(iframeNodes, iframe.url(), usedIndexes) ||
        // Fallback to pick the iframe based on order
        iframeNodes[index];

      if (!node) {
        continue;
      }

      usedIndexes.add(iframeNodes.indexOf(node));

      const iframeSnapshot = await executeSnapshotScript(iframe);
      node.contentDocument = iframeSnapshot.domSnapshot;
      node.pseudoClassIds = iframeSnapshot.pseudoClassIds;

      // Detect nested iframes
      iframeNodes.push(...findIframes(iframeSnapshot.domSnapshot));
    }
  }

  const bufferedSnapshot = Buffer.from(JSON.stringify(domSnapshot));
  if (!chromaticSnapshots.has(testId)) {
    // map used so the snapshots are always in order
    chromaticSnapshots.set(testId, new Map());
  }
  chromaticSnapshots.get(testId).set(name, {
    snapshot: bufferedSnapshot,
    viewport: page.viewportSize() || { width: 1280, height: 720 },
    pseudoClassIds,
  });
}

async function executeSnapshotScript(context: Page | Frame): Promise<{
  domSnapshot: serializedNodeWithId;
  pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'];
}> {
  return await context.evaluate(dedent`
    ${rrweb};

    // this code was erroring the page.evaluate() when it was passed as a function to page.evaluate(),
    // so for now it is being passed as a string until that can be resolved.
    const doPostProcessing = (rrwebSnapshotInstance, documentToSnapshot) => {
      return new Promise((resolve) => {
        const mirror = rrwebSnapshotInstance.createMirror();
        const domSnapshot = rrwebSnapshotInstance.snapshot(documentToSnapshot, { recordCanvas: true, mirror });

        const pseudoClassIds = {};

        for (const className of [':hover', ':focus', ':focus-visible', ':active']) {
          const elements = documentToSnapshot.querySelectorAll(className);
          const ids = Array.from(elements, (el) => mirror.getId(el)).filter((id) => id !== -1);
          pseudoClassIds[className] = ids;
        }

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
          resolve({ domSnapshot, pseudoClassIds });
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
}

function findIframes(
  node: serializedNodeWithId
): (serializedNodeWithId & { type: NodeType.Element; tagName: 'iframe' })[] {
  if (node.type === NodeType.Element && node.tagName === 'iframe') {
    return [node as serializedNodeWithId & { type: NodeType.Element; tagName: 'iframe' }];
  }

  if ('childNodes' in node) {
    return node.childNodes.flatMap((childNode) => {
      return findIframes(childNode);
    });
  }

  return [];
}

function filterIframes(
  nodes: SerializedIframeNode[],
  url: string,
  usedIndexes: Set<number>
): SerializedIframeNode | undefined {
  return nodes.find((node, index) => {
    if (usedIndexes.has(index)) {
      return false;
    }

    // rrweb-snapshot rewrites "src" -> "rr_src": https://github.com/chromaui/rrweb/blob/875dd23b7a8a46071b7c00a13c79e53ed08d1b97/packages/rrweb-snapshot/src/snapshot.ts#L769-L777
    return node.attributes?.rr_src === url;
  });
}

export { takeSnapshot };
