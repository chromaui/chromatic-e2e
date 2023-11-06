import { outputFile, ensureDir, outputJson } from 'fs-extra';
import { join } from 'path';
import type { TestInfo } from '@playwright/test';
import type { elementNode } from '@chromaui/rrweb-snapshot';
import { logger } from '../utils/logger';
import { ArchiveFile } from './archive-file';
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

export async function writeTestResult(
  testInfo: TestInfo,
  domSnapshots: Record<string, Buffer>,
  archive: ResourceArchive,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  const { title, outputDir } = testInfo;
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

      const archiveFile = new ArchiveFile(url, response);
      const origSrcPath = archiveFile.originalSrc();
      const fileSystemPath = archiveFile.toFileSystemPath();

      if (origSrcPath !== fileSystemPath) {
        sourceMap.set(origSrcPath, fileSystemPath);
      }

      await outputFile(join(archiveDir, fileSystemPath), response.body);
    })
  );

  await writeSnapshotFiles(domSnapshots, archiveDir, title, sourceMap);

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

async function writeSnapshotFiles(
  domSnapshots: Record<string, Buffer>,
  archiveDir: string,
  title: string,
  sourceMap: Map<string, string>
) {
  // The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received an instance of Object
  await Object.entries(domSnapshots).map(async ([name, domSnapshot]) => {
    // XXX_jwir3: We go through our stories here and map any instances that are found in
    //            the keys of the source map to their respective values.
    const mappedSnapshot = await mapSourceEntries(domSnapshot, sourceMap);

    await outputFile(
      join(archiveDir, `${sanitize(title)}-${sanitize(name)}.snapshot.json`),
      mappedSnapshot
    );
  });
}
/**
 * Accepts a DOM snapshot, which is either a `Buffer` or an object in json form, and maps all `src` attributes that are equivalent to
 * one of the entries in the `sourceMap` to the resulting value.
 *
 * @param domSnapshot The DOM snapshot upon which to run the mapping, as a Buffer
 * @param sourceMap A mapping of `string` objects to other `string` objects. All `src` attributes that are keys in this map will be
 *                  adjusted to be the resulting value.
 * @returns A JSON string representing the mapped DOM snapshot.
 */
async function mapSourceEntries(domSnapshot: Buffer, sourceMap: Map<string, string>) {
  let jsonBuffer: elementNode;
  if (Buffer.isBuffer(domSnapshot)) {
    const bufferAsString = domSnapshot.toString('utf-8');

    // Try to parse as JSON. Our tests don't always return JSON, so this is kind of a hack
    // to avoid a situation where JSON is expected but not actually given.
    try {
      jsonBuffer = JSON.parse(bufferAsString);
    } catch (err) {
      return domSnapshot;
    }
  } else {
    jsonBuffer = domSnapshot;
  }

  if (jsonBuffer.attributes && jsonBuffer.attributes.src) {
    const sourceVal = jsonBuffer.attributes.src as string;
    if (sourceMap.has(sourceVal)) {
      jsonBuffer.attributes.src = sourceMap.get(sourceVal);
    }
  }

  if (jsonBuffer.childNodes) {
    jsonBuffer.childNodes = await Promise.all(
      jsonBuffer.childNodes.map(async (child) => {
        const jsonString = JSON.stringify(child);
        const mappedSourceEntriesBuffer = await mapSourceEntries(
          Buffer.from(jsonString),
          sourceMap
        );
        const mappedSourceEntries = JSON.parse(mappedSourceEntriesBuffer.toString('utf-8'));
        return mappedSourceEntries;
      })
    );
  }

  return Buffer.from(JSON.stringify(jsonBuffer));
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
