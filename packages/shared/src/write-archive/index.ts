import { outputFile, ensureDir, outputJson } from 'fs-extra';
import { join } from 'path';
import { logger } from '../utils/logger';
import { ArchiveFile } from './archive-file';
import { DOMSnapshot } from './dom-snapshot';
import type { ResourceArchive } from '../resource-archive';
import type { ChromaticStorybookParameters } from '../types';

// @storybook/csf's sanitize function, we could import this
export const sanitize = (string: string) => {
  return (
    string
      .toLowerCase()
      // eslint-disable-next-line no-useless-escape
      .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  );
};

// We write a collection of DOM snapshots and a resource archive in the following locations:
// <test-title>.stories.json
// archive/<test-title>.json
// archive/<file>.<ext>

interface E2ETestInfo {
  title: string;
  titlePath: string[];
  outputDir: string;
  pageUrl: string;
}

export async function writeTestResult(
  e2eTestInfo: E2ETestInfo,
  domSnapshots: Record<string, Buffer>,
  archive: ResourceArchive,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  const { titlePath, outputDir, pageUrl } = e2eTestInfo;
  const titlePathWithoutFileExtensions = titlePath.map((aTitle) => aTitle.split('.')[0]);
  const title = titlePathWithoutFileExtensions.join(' / ');
  // outputDir gives us the test-specific subfolder (https://playwright.dev/docs/api/class-testconfig#test-config-output-dir);
  // we want to write one level above that
  const finalOutputDir = join(outputDir, '..', 'chromatic-archives');

  const archiveDir = join(finalOutputDir, 'archive');

  await ensureDir(finalOutputDir);

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

  await Promise.all(
    await Object.entries(domSnapshots).map(async ([name, domSnapshot]) => {
      // XXX_jwir3: We go through our stories here and map any instances that are found in
      //            the keys of the source map to their respective values.
      const snapshot = new DOMSnapshot(domSnapshot);
      const mappedSnapshot = await snapshot.mapAssetPaths(sourceMap);

      await outputFile(
        join(archiveDir, `${sanitize(title)}-${sanitize(name)}.snapshot.json`),
        mappedSnapshot
      );
    })
  );

  await writeStoriesFile(
    join(finalOutputDir, `${sanitize(title)}.stories.json`),
    title,
    domSnapshots,
    chromaticStorybookParams
  );

  const errors = Object.entries(archive).filter(([, r]) => 'error' in r);
  if (errors.length > 0) {
    logger.log(`Encountered ${errors.length} errors archiving resources, writing to 'errors.json'`);
    await outputJson(join(archiveDir, `errors.json`), {
      errors: Object.fromEntries(errors),
    });
  }
}

async function writeStoriesFile(
  storiesFilename: string,
  title: string,
  domSnapshots: Record<string, Buffer>,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  logger.log(`Writing ${storiesFilename}`);
  await outputJson(storiesFilename, {
    title,
    stories: Object.keys(domSnapshots).map((name) => ({
      name,
      parameters: {
        server: { id: `${sanitize(title)}-${sanitize(name)}.snapshot.json` },
        chromatic: {
          ...chromaticStorybookParams,
        },
      },
    })),
  });
}
