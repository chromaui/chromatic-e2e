import type { elementNode } from 'rrweb-snapshot';
import { writeTestResult } from '@chromaui/shared-e2e';
import type { ChromaticStorybookParameters, ResourceArchive } from '@chromaui/shared-e2e';

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
    {
      title: testTitle,
      // this will store it at ./cypress/downloads (the last directory doesn't matter)
      // TODO: change so we don't have to do this trickery
      outputDir: './cypress/downloads/some',
      pageUrl,
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    // @ts-expect-error will fix when Cypress has its own package
    { ...chromaticStorybookParams, viewport: { width: 500, height: 500 } }
  );
};

export const archiveCypress = async (params: ArchiveParams): Promise<null> => {
  await doArchive(params);

  return null;
};
