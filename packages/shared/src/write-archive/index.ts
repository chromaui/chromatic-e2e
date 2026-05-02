import { join } from 'node:path';
import { outputFile, ensureDir, outputJSONFile, readJSONFile } from '../utils/filePaths';
import { logger } from '../utils/logger';
import { ArchiveFile } from './archive-file';
import { DOMSnapshot } from './dom-snapshot';
import type { ResourceArchive } from '../resource-archiver';
import type { ChromaticStorybookParameters, DOMSnapshots } from '../types';
import { snapshotFileName, snapshotId } from './snapshot-files';
import { createStories, snapshotTitle, storiesFileName } from './stories-files';

// We write a collection of DOM snapshots and a resource archive in the following locations:
// <test-title>.stories.json
// archive/<test-title>.json
// archive/<file>.<ext>

interface E2ETestInfo {
  titlePath: string[];
  storyName?: string;
  outputDir: string;
  pageUrl: string;
}

type StoriesFile = ReturnType<typeof createStories>;
const storiesFileWrites = new Map<string, Promise<void>>();

export async function writeTestResult(
  e2eTestInfo: E2ETestInfo,
  domSnapshots: DOMSnapshots,
  archive: ResourceArchive,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  const { titlePath, outputDir, pageUrl } = e2eTestInfo;
  // remove the test file extensions (.spec.ts|ts, .cy.ts|js), preserving other periods in directory, file name, or test titles
  const titlePathWithoutFileExtensions = titlePath.map((pathPart) =>
    // make sure we remove file extensions, even if the file name doesn't have .spec or .test or.cy
    // possible extensions:
    // playwright: https://playwright.dev/docs/test-configuration#filtering-tests
    // cypress: https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests#Spec-files
    pathPart.replace(/\.(ts|js|mjs|cjs|tsx|jsx|cjsx|coffee)$/, '').replace(/\.(spec|test|cy)$/, '')
  );
  // in Storybook, `/` splits the title out into hierarchies (folders)
  const title = titlePathWithoutFileExtensions
    .join('/')
    // Make sure we don't end up with folders with just special characters
    // Transforms paths like "src/components/accordion/<Accordion/>/opens and closes" to "src/components/accordion/<Accordion>/opens and closes "
    // eslint-disable-next-line no-useless-escape
    .replace(/\/([ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\]+)\//gi, '$1/');

  const finalOutputDir = join(outputDir, 'chromatic-archives');

  const archiveDir = join(finalOutputDir, 'archive');

  await ensureDir(archiveDir);

  logger.log(`Writing test results for "${title}"`);

  // Used to store any changes to the asset paths made in order to save them to the file system
  // so that we can update the `src` attributes in the DOM snapshots.
  const sourceMap = new Map<string, string>();

  await Promise.all(
    Object.entries(archive).map(async ([url, response]) => {
      if ('error' in response) return;

      const archiveFile = new ArchiveFile(url, response, pageUrl);
      const origSrcPath = archiveFile.originalSrc();
      const fileSystemPath = archiveFile.toFileSystemPath();

      if (origSrcPath !== fileSystemPath) {
        sourceMap.set(origSrcPath, fileSystemPath);
      }

      await outputFile(join(archiveDir, fileSystemPath), response.body);
    })
  );

  const snapshotTitlePath = snapshotTitle(title, e2eTestInfo.storyName);
  await Promise.all(
    Object.entries(domSnapshots).map(async ([name, { snapshot: domSnapshot, viewport }]) => {
      // XXX_jwir3: We go through our stories here and map any instances that are found in
      //            the keys of the source map to their respective values.
      const snapshot = new DOMSnapshot(domSnapshot);
      const mappedSnapshot = await snapshot.mapAssetPaths(sourceMap);

      const snapshotFile = snapshotFileName(snapshotId(snapshotTitlePath, name), viewport);
      await outputFile(join(archiveDir, snapshotFile), mappedSnapshot);
    })
  );

  const storiesFile = join(finalOutputDir, storiesFileName(title));
  const storiesJson = createStories(
    title,
    domSnapshots,
    chromaticStorybookParams,
    e2eTestInfo.storyName
  );
  await writeStoriesFile(storiesFile, storiesJson, Boolean(e2eTestInfo.storyName));

  const errors = Object.entries(archive).filter(([, r]) => 'error' in r);
  if (errors.length > 0) {
    logger.log(`Encountered ${errors.length} errors archiving resources, writing to 'errors.json'`);
    await outputJSONFile(join(archiveDir, `errors.json`), {
      errors: Object.fromEntries(errors),
    });
  }
}

async function writeStoriesFile(filePath: string, storiesJson: StoriesFile, merge: boolean) {
  if (!merge) {
    await outputJSONFile(filePath, storiesJson);
    return;
  }

  const previousWrite = storiesFileWrites.get(filePath) || Promise.resolve();
  const nextWrite = previousWrite.then(async () => {
    const existingStoriesJson = await readJSONFile<StoriesFile>(filePath);
    await outputJSONFile(filePath, mergeStories(existingStoriesJson, storiesJson));
  });

  storiesFileWrites.set(
    filePath,
    nextWrite.finally(() => {
      if (storiesFileWrites.get(filePath) === nextWrite) {
        storiesFileWrites.delete(filePath);
      }
    })
  );

  await nextWrite;
}

function mergeStories(existingStoriesJson: StoriesFile | undefined, storiesJson: StoriesFile) {
  if (!existingStoriesJson) return storiesJson;

  const storyNames = new Set(storiesJson.stories.map((story) => story.name));
  return {
    ...storiesJson,
    stories: [
      ...existingStoriesJson.stories.filter((story) => !storyNames.has(story.name)),
      ...storiesJson.stories,
    ],
  };
}
