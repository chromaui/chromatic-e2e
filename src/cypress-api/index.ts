import { writeTestResult } from '../write-archive';
import { shortenFileNameSrc } from '../playwright-api/takeArchive';
// @ts-ignore
export const archiveCypress = async ({ domSnapshot, resourceArchive }) => {
  const sourceMap: Map<string, string> = new Map<string, string>();
  if (domSnapshot.childNodes.length !== 0) {
    shortenFileNameSrc(domSnapshot.childNodes, sourceMap);
  }

  const bufferedArchiveList = Object.entries(resourceArchive).map(([key, value]) => {
    return [
      key,
      {
        // @ts-ignore
        ...value,
        // we can't use Buffer in the browser (when we collect the responses)
        // so we go through one by one here and bufferize them
        // @ts-ignore
        body: Buffer.from(value.body, 'utf8'),
      },
    ];
  });

  await writeTestResult(
    null,
    {
      fromCypress: Buffer.from(JSON.stringify(domSnapshot)),
    },
    Object.fromEntries(bufferedArchiveList),
    // @ts-ignore
    {},
    sourceMap
  );
};
