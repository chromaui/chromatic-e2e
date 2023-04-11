import { outputFile, ensureDir, ensureSymlink, outputJson, remove } from 'fs-extra';
import { join, resolve } from 'path';

import type { ResourceArchive } from '../resource-archive';
import { logger } from '../logger';

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

const { OUTPUT_DIR = './test-archives' } = process.env;
const outputDir = resolve(OUTPUT_DIR);
const latestDir = join(outputDir, 'latest');

// We take the timestamp once when the file is first process and use this timestamp for every
// result we write
const timestamp = sanitize(new Date().toLocaleString());
const resultsDir = join(outputDir, timestamp);
const archiveDir = join(resultsDir, 'archive');

// We write a collection of DOM snapshots and a resource archive in the following locations:
// ./test-results/latest => ./test-results/<timestamp> (a symlink)
// ./test-results/<timestamp>/<title>.stories.json
// ./test-results/<timestamp>/archive/<title-name>.snapshot.json
// ./test-results/<timestamp>/archive/<file>.<ext>

export async function writeTestResult(
  title: string,
  domSnapshots: Record<string, Buffer>,
  archive: ResourceArchive
) {
  await ensureDir(outputDir);
  await ensureDir(resultsDir);

  // Not sure if there's a cleaner way to do this -- ensure latestDir points to resultsDir
  try {
    await ensureSymlink(resultsDir, latestDir);
  } catch (err) {
    await remove(latestDir);
    await ensureSymlink(resultsDir, latestDir);
  }

  logger.log(`Writing test results for "${title}"`);

  await Promise.all(
    Object.entries(archive).map(async ([url, response]) => {
      const { pathname } = new URL(url);
      await outputFile(
        join(archiveDir, pathname.endsWith('/') ? `${pathname}index.html` : pathname),
        response.body
      );
    })
  );

  await Object.entries(domSnapshots).map(async ([name, domSnapshot]) => {
    await outputFile(
      join(archiveDir, `${sanitize(title)}-${sanitize(name)}.snapshot.json`),
      domSnapshot
    );
  });

  await writeStoriesFile(join(resultsDir, `${sanitize(title)}.stories.json`), title, domSnapshots);
}

async function writeStoriesFile(
  storiesFilename: string,
  title: string,
  domSnapshots: Record<string, Buffer>
) {
  logger.log(`Writing ${storiesFilename}`);
  await outputJson(storiesFilename, {
    title,
    stories: Object.keys(domSnapshots).map((name) => ({
      name,
      parameters: {
        server: { id: `${sanitize(title)}-${sanitize(name)}.snapshot.json` },
      },
    })),
  });
}
