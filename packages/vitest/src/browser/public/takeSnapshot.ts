import { assert } from 'vitest';
import { commands } from 'vitest/browser';
import { snapshot } from '@chromaui/rrweb-snapshot';
import { serializedNodeWithId } from '@rrweb/types';
import { getCurrentTest } from '../getCurrentTest';
import type {} from '../../node/commands';

/**
 * Take visual regression snapshot of the current state of the DOM.
 */
export async function takeSnapshot(name?: string) {
  const test = getCurrentTest();
  assert(test, 'takeSnapshot() must be called within a test()');

  const domSnapshot = snapshot(document, { recordCanvas: true });

  assert(domSnapshot, 'Failed to capture DOM snapshot');

  await replaceBlobUrls(domSnapshot);

  await commands.__chromatic_uploadDOMSnapshot(test.id, domSnapshot, name);
}

async function replaceBlobUrls(node: serializedNodeWithId) {
  if (!('childNodes' in node)) {
    return;
  }

  await Promise.all(
    node.childNodes.map(async (childNode) => {
      if (
        'tagName' in childNode &&
        childNode.tagName === 'img' &&
        typeof childNode.attributes.src === 'string' &&
        childNode.attributes.src?.startsWith('blob:')
      ) {
        const base64Url = await toDataURL(childNode.attributes.src);
        childNode.attributes.src = base64Url;
      }

      if ('childNodes' in childNode && childNode.childNodes?.length) {
        await replaceBlobUrls(childNode);
      }
    })
  );
}

async function toDataURL(url: string): Promise<string> {
  const blob = await fetch(url).then((res) => res.blob());

  return new Promise<string>((resolveFileRead, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolveFileRead(reader.result?.toString() || '');
    reader.onerror = reject;

    // convert the blob to base64 string
    reader.readAsDataURL(blob);
  });
}
