import { join } from 'path';
import { outputFile, ensureDir, outputJSONFile } from '../utils/filePaths';
import { logger } from '../utils/logger';
import { ArchiveFile } from './archive-file';
import { DOMSnapshot } from './dom-snapshot';
import type { ResourceArchive } from '../resource-archive';
import type { ChromaticStorybookParameters } from '../types';
import { Viewport } from '../utils/viewport';
import { snapshotFileName, snapshotId } from './snapshot-files';
import { createStories, storiesFileName } from './stories-files';

// We write a collection of DOM snapshots and a resource archive in the following locations:
// <test-title>.stories.json
// archive/<test-title>.json
// archive/<file>.<ext>

// const ARCHIVE_DENYLIST: string[] = ['http://localhost:6006/index.json'];
const ARCHIVE_DENYLIST: RegExp[] = [/'^(https?:\/\/)localhost:(\d+)\/index\.json'/i];

interface E2ETestInfo {
  titlePath: string[];
  outputDir: string;
  pageUrl: string;
  viewport: Viewport;
}

export async function writeTestResult(
  e2eTestInfo: E2ETestInfo,
  domSnapshots: Record<string, Buffer>,
  archive: ResourceArchive,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  const { titlePath, outputDir, pageUrl, viewport } = e2eTestInfo;
  // remove the test file extensions (.spec.ts|ts, .cy.ts|js), preserving other periods in directory, file name, or test titles
  const titlePathWithoutFileExtensions = titlePath.map((pathPart) =>
    // make sure we remove file extensions, even if the file name doesn't have .spec or .test or.cy
    // possible extensions:
    // playwright: https://playwright.dev/docs/test-configuration#filtering-tests
    // cypress: https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests#Spec-files
    pathPart.replace(/\.(ts|js|mjs|cjs|tsx|jsx|cjsx|coffee)$/, '').replace(/\.(spec|test|cy)$/, '')
  );
  // in Storybook, `/` splits the title out into hierarchies (folders)
  const title = titlePathWithoutFileExtensions.join('/');
  // outputDir gives us the test-specific subfolder (https://playwright.dev/docs/api/class-testconfig#test-config-output-dir);
  // we want to write one level above that
  const finalOutputDir = join(outputDir, '..', 'chromatic-archives');

  const archiveDir = join(finalOutputDir, 'archive');

  await ensureDir(archiveDir);

  logger.log(`Writing test results for "${title}"`);

  // Used to store any changes to the asset paths made in order to save them to the file system
  // so that we can update the `src` attributes in the DOM snapshots.
  const sourceMap = new Map<string, string>();

  await Promise.all(
    Object.entries(archive).map(async ([url, response]) => {
      if ('error' in response) return;
      if (!ARCHIVE_DENYLIST.some((regex) => regex.test(url))) return;

      const archiveFile = new ArchiveFile(url, response, pageUrl);
      const origSrcPath = archiveFile.originalSrc();
      const fileSystemPath = archiveFile.toFileSystemPath();

      if (origSrcPath !== fileSystemPath) {
        sourceMap.set(origSrcPath, fileSystemPath);
      }

      await outputFile(join(archiveDir, fileSystemPath), response.body);
    })
  );

  await Promise.all(
    await Object.entries(domSnapshots).map(async ([name, domSnapshot]) => {
      // XXX_jwir3: We go through our stories here and map any instances that are found in
      //            the keys of the source map to their respective values.
      const snapshot = new DOMSnapshot(domSnapshot);
      const mappedSnapshot = await snapshot.mapAssetPaths(sourceMap);

      const snapshotFile = snapshotFileName(snapshotId(title, name), viewport);
      await outputFile(join(archiveDir, snapshotFile), mappedSnapshot);
    })
  );

  const storiesFile = storiesFileName(title);
  const storiesJson = createStories(title, domSnapshots, chromaticStorybookParams);
  await outputJSONFile(join(finalOutputDir, storiesFile), storiesJson);

  const errors = Object.entries(archive).filter(([, r]) => 'error' in r);
  if (errors.length > 0) {
    logger.log(`Encountered ${errors.length} errors archiving resources, writing to 'errors.json'`);
    await outputJSONFile(join(archiveDir, `errors.json`), {
      errors: Object.fromEntries(errors),
    });
  }
}
