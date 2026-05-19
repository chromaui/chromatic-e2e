import { snapshot, createMirror } from '@chromaui/rrweb-snapshot';
import { type DOMSnapshots } from '@chromatic-com/shared-e2e';
import { type serializedNodeWithId } from '@rrweb/types';

/** Function in global `Window` that is used to report the snapshot results */
export type ResultFunctionName = '__chromatic_report_results__';

/** Shape of the {@link ResultFunctionName} report callback */
export type SnapshotOutput = Awaited<ReturnType<typeof takeSnapshot>>;

/** Server side is expected to expose this function in {@link file://./takeSnapshot.ts} */
if (!isWindowWithReportFunction(window)) {
  throw new Error(
    'Missing __chromatic_report_results__ function on window. Was exposeFunction called?'
  );
}

const results = await takeSnapshot();
window.__chromatic_report_results__(results);

async function takeSnapshot() {
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

function isWindowWithReportFunction(
  win: object
): win is Record<ResultFunctionName, (result: SnapshotOutput) => void> {
  return (
    ('__chromatic_report_results__' satisfies ResultFunctionName) in win &&
    typeof win.__chromatic_report_results__ === 'function'
  );
}
