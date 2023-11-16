import type { elementNode } from 'rrweb-snapshot';
import { writeTestResult } from '../write-archive';
import type { ChromaticStorybookParameters } from '../types';
import type { ResourceArchive } from '../resource-archive';

interface ArchiveParams {
  testTitle: string;
  domSnapshots: elementNode[];
  resourceArchive: ResourceArchive;
  chromaticStorybookParams: ChromaticStorybookParameters;
  pageUrl: string;
}

const doArchive = async ({
  testTitle,
  domSnapshots,
  resourceArchive,
  chromaticStorybookParams,
  pageUrl,
}: ArchiveParams) => {
  const bufferedArchiveList = Object.entries(resourceArchive).map(([key, value]) => {
    return [
      key,
      {
        ...value,
        // we can't use Buffer in the browser (when we collect the responses)
        // so we go through one by one here and bufferize them
        // @ts-expect-error will fix when Cypress has its own package
        body: Buffer.from(value.body, 'utf8'),
      },
    ];
  });

  const allSnapshots = Object.fromEntries(
    domSnapshots.map((item, index) => [`Snapshot #${index + 1}`, Buffer.from(JSON.stringify(item))])
  );

  await writeTestResult(
    // @ts-expect-error will fix when Cypress has its own package
    {
      title: testTitle,
      // doesn't matter what value we put here, as long as it's a subdirectory of where we want this to actually go
      // TODO: change so we don't have to do this trickery
      outputDir: './some',
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    { ...chromaticStorybookParams, viewport: { width: 500, height: 500 } },
    pageUrl
  );
};

export const archiveCypress = async (params: ArchiveParams): Promise<null> => {
  await doArchive(params);

  return null;
};
