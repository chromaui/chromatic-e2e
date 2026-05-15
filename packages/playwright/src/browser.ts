import { snapshot, createMirror } from '@chromaui/rrweb-snapshot';
import { type DOMSnapshots } from '@chromatic-com/shared-e2e';
import { serializedNodeWithId } from '@rrweb/types';

export async function takeSnapshot() {
  const mirror = createMirror();
  const domSnapshot = snapshot(document, { recordCanvas: true, mirror });

  const pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'] = {};

  for (const className of [':hover', ':focus', ':focus-visible', ':active'] as const) {
    const elements = document.querySelectorAll(className);
    const ids = Array.from(elements, (el) => mirror.getId(el)).filter((id) => id !== -1);
    pseudoClassIds[className] = ids;
  }

  await replaceBlobUrls(domSnapshot);

  return { domSnapshot, pseudoClassIds };
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
