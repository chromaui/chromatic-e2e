import { resolve } from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';
import { viewportToString } from '@chromatic-com/shared-e2e';
import {
  buildStoryModesConfig,
  buildStoryViewportsConfig,
  findDefaultViewport,
} from '@chromatic-com/shared-e2e/write-archive/stories-files';
import { DEFAULT_OUTPUT_DIR } from '../constants';

interface Viewport {
  height: number;
  width: number;
}

export async function addViewportsToStoriesFiles() {
  const snapshotsDir = resolve(archivesDir(DEFAULT_OUTPUT_DIR), 'archive');
  const snapshotFileNames = await readdir(snapshotsDir).then((files) =>
    files.filter((file) => file.endsWith('.snapshot.json'))
  );
  const viewportsLookup = buildSnapshotViewportsLookup(snapshotFileNames);

  const storiesDir = archivesDir(DEFAULT_OUTPUT_DIR);

  const storiesFilePaths = await readdir(storiesDir).then((files) => {
    return files
      .filter((file) => file.endsWith('.stories.json'))
      .map((file) => resolve(storiesDir, file));
  });

  await Promise.all(
    storiesFilePaths.map(async (storiesFilePath) => {
      const data = await readFile(storiesFilePath);
      const storiesFileJson = JSON.parse(data.toString());
      const storiesWithViewports = addViewportsToStories(storiesFileJson, viewportsLookup);

      await writeFile(storiesFilePath, JSON.stringify(storiesWithViewports, null, 2), {
        mode: 0o777,
        encoding: 'utf-8',
      });
    })
  );
}

function addViewportsToStories(
  storiesFileJson: any,
  viewportsStoriesLookup: Record<string, Viewport[]>
) {
  const { stories } = storiesFileJson;
  const storiesWithViewports = stories.map((story: any) => {
    const storyId = story.parameters.server.id;
    const viewports = viewportsStoriesLookup[storyId];
    return {
      ...story,
      parameters: {
        ...story.parameters,
        chromatic: {
          ...story.parameters.chromatic,
          modes: buildStoryModesConfig(viewports),
        },
        viewport: {
          options: buildStoryViewportsConfig(viewports),
          defaultViewport: viewportToString(findDefaultViewport(viewports)),
        },
      },
    };
  });

  return {
    ...storiesFileJson,
    stories: storiesWithViewports,
  };
}

function buildSnapshotViewportsLookup(snapshotFileNames: string[]) {
  const lookup: Record<string, Viewport[]> = {};
  snapshotFileNames.forEach((file) => {
    const fileParts = file.split('.');

    const snapshotId = fileParts.slice(0, fileParts.length - 3).join('.'); // .viewport.snapshot.json
    const viewports = lookup[snapshotId] || [];
    const viewport = parseViewport(fileParts[fileParts.length - 3]);

    viewports.push(viewport);
    lookup[snapshotId] = viewports;
  });

  return lookup;
}

function parseViewport(viewportString: string): Viewport {
  const matcher = viewportString.match(/w(\d+)h(\d+)/);
  return {
    width: Number(matcher[1]),
    height: Number(matcher[2]),
  };
}
