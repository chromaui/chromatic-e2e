import { writeTestResult } from '../write-archive';
import { shortenFileNameSrc } from '../playwright-api/takeArchive';
// @ts-ignore
export const archiveCypress = async ({ testTitle, domSnapshots, resourceArchive }) => {
  const sourceMap: Map<string, string> = new Map<string, string>();

  // @ts-ignore
  domSnapshots.forEach((snapshot) => {
    if (snapshot.childNodes.length !== 0) {
      shortenFileNameSrc(snapshot.childNodes, sourceMap);
    }
  });

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

  const allSnapshots = Object.fromEntries(
    // @ts-ignore
    domSnapshots.map((item, index) => [`Snapshot #${index + 1}`, Buffer.from(JSON.stringify(item))])
  ) as Record<string, Buffer>;

  await writeTestResult(
    // @ts-ignore
    {
      title: testTitle,
      // doesn't matter what value we put here, as long as it's a subdirectory of where we want this to actually go
      outputDir: './some',
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    { viewport: { width: 500, height: 500 } },
    sourceMap
  );
};
