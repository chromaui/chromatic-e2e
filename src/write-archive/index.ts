import { outputFile, ensureDir, outputJson } from 'fs-extra';
import { join } from 'path';

import type { ResourceArchive } from '../resource-archive';
import { logger } from '../utils/logger';

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
  testInfo: any,
  domSnapshots: Record<string, Buffer>,
  archive: ResourceArchive,
  chromaticOptions: { viewport: { width: number; height: number } }
) {
  const { title, outputDir } = testInfo;
  // outputDir gives us the test-specific subfolder (https://playwright.dev/docs/api/class-testconfig#test-config-output-dir);
  // we want to write one level above that
  const finalOutputDir = join(outputDir, '..', 'chromatic-archives');

  const archiveDir = join(finalOutputDir, 'archive');

  await ensureDir(finalOutputDir);

  logger.log(`Writing test results for "${title}"`);

  await Promise.all(
    Object.entries(archive).map(async ([url, response]) => {
      if ('error' in response) return;

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

  await writeStoriesFile(
    join(finalOutputDir, `${sanitize(title)}.stories.json`),
    title,
    domSnapshots,
    chromaticOptions
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
  chromaticOptions: { viewport: { width: number; height: number } }
) {
  logger.log(`Writing ${storiesFilename}`);
  await outputJson(storiesFilename, {
    title,
    stories: Object.keys(domSnapshots).map((name) => ({
      name,
      parameters: {
        server: { id: `${sanitize(title)}-${sanitize(name)}.snapshot.json` },
        chromatic: {
          viewports: [chromaticOptions.viewport.width],
        },
      },
    })),
  });
}
