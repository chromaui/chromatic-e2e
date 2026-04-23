import { createMirror, snapshot } from '@chromaui/rrweb-snapshot';
import { CypressSnapshot } from './types';
import type { serializedNodeWithId } from '@rrweb/types';

export const takeSnapshot = (
  doc: Document,
  viewport: { width: number; height: number },
  isManualSnapshot?: boolean
): Promise<CypressSnapshot | null> => {
  return new Promise((resolve) => {
    if (!isManualSnapshot && Cypress.env('disableAutoSnapshot')) {
      resolve(null);
    }

    const mirror = createMirror();
    const domSnapshot = snapshot(doc, { recordCanvas: true, mirror })!;

    const pseudoClassIds: CypressSnapshot['pseudoClassIds'] = {};

    for (const className of [':hover', ':focus', ':focus-visible', ':active']) {
      const elements = doc.querySelectorAll(className);
      const ids = Array.from(elements, (el) => mirror.getId(el)).filter((id) => id !== -1);
      pseudoClassIds[className] = ids;
    }

    // do some post-processing on the snapshot
    const toDataURL = async (url: string) => {
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

    const replaceBlobUrls = async (node: serializedNodeWithId) => {
      await Promise.all(
        // @ts-expect-error we assume childNodes will be on there
        node.childNodes.map(async (childNode) => {
          if (childNode.tagName === 'img' && childNode.attributes.src?.startsWith('blob:')) {
            const base64Url = await toDataURL(childNode.attributes.src);
            childNode.attributes.src = base64Url;
          }

          if (childNode.childNodes?.length) {
            await replaceBlobUrls(childNode);
          }
        })
      );
    };

    replaceBlobUrls(domSnapshot).then(() => {
      resolve({ snapshot: domSnapshot, viewport, pseudoClassIds });
    });
  });
};
