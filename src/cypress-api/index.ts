import { writeTestResult } from '../write-archive';
import { SourceMapper } from '../utils/source-mapper';

const doArchive = async ({
  testTitle,
  domSnapshots,
  resourceArchive,
  chromaticStorybookParams,
}) => {
  let sourceMap = null;

  if (domSnapshots.length > 0) {
    // shortens file names in the last snapshot (which is the automatic one)
    const sourceMapper = new SourceMapper(domSnapshots[domSnapshots.length - 1]);
    sourceMap = sourceMapper.shortenFileNamesLongerThan(250).build();
  }

  const bufferedArchiveList = Object.entries(resourceArchive).map(([key, value]) => {
    return [
      key,
      {
        ...value,
        // we can't use Buffer in the browser (when we collect the responses)
        // so we go through one by one here and bufferize them
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
      // doesn't matter what value we put here, as long as it's a subdirectory of where we want this to actually go
      // TODO: change so we don't have to do this trickery
      outputDir: './some',
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    { ...chromaticStorybookParams, viewport: { width: 500, height: 500 } },
    sourceMap
  );
};

export const archiveCypress = (stuff) => {
  doArchive(stuff);

  // Cypress tasks must return a value or null: https://docs.cypress.io/api/commands/task#Usage
  return null;
};
