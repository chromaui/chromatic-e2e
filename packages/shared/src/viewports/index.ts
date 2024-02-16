import { outputJSON, readJSON } from 'fs-extra';
import path from 'path';
import { archivesDir, assetsDir } from '../utils/filePaths';
import { Viewport, viewportToString } from '../utils/viewport';
import {
  listSnapshotFiles,
  snapshotIdFromFileName,
  viewportFromFileName,
} from '../write-archive/snapshot-files';
import { listStoriesFiles } from '../write-archive/stories-files';

// Adds mode and viewport config parameters to all stories files
export async function addViewportsToStories() {
  const snapshotsDir = assetsDir();
  const snapshotFileNames = await listSnapshotFiles(snapshotsDir);
  const viewportsLookup = buildSnapshotViewportsLookup(snapshotFileNames);

  const storiesDir = archivesDir();
  const storiesFilePaths = (await listStoriesFiles(storiesDir)).map((storiesFileName) =>
    path.resolve(storiesDir, storiesFileName)
  );

  await Promise.all(
    storiesFilePaths.map(async (storiesFilePath) => {
      const storiesFileJson = await readJSON(storiesFilePath);
      const { stories } = storiesFileJson;
      const storiesWithViewports = stories.map((story: any) => {
        const storyId = story.parameters.server.id;
        const viewports = viewportsLookup[storyId];
        return {
          ...story,
          parameters: {
            ...story.parameters,
            chromatic: {
              ...story.parameters.chromatic,
              modes: buildStoryModesConfig(viewports),
            },
            viewport: {
              viewports: buildStoryViewportsConfig(viewports),
              defaultViewport: viewportToString(findDefaultViewport(viewports)),
            },
          },
        };
      });

      await outputJSON(storiesFilePath, {
        ...storiesFileJson,
        stories: storiesWithViewports,
      });
    })
  );
}

// Builds a lookup table mapping snapshot IDs to the list of viewports
// each was captured at, with a shape like so:
// { 'some-test-snapshot-1': [{ width: 1200, height: 600 }, { width: 400, height: 600 }] }
function buildSnapshotViewportsLookup(snapshotFileNames: string[]) {
  const lookup: Record<string, Viewport[]> = {};
  snapshotFileNames.forEach((file) => {
    const snapshotId = snapshotIdFromFileName(file);
    const viewports = lookup[snapshotId] || [];
    viewports.push(viewportFromFileName(file));
    lookup[snapshotId] = viewports;
  });

  return lookup;
}

// Converts the given list of viewports into the modes
// config object needed for the Storybook parameters.
function buildStoryModesConfig(viewports: Viewport[]) {
  return viewports.reduce((modes: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);
    // eslint-disable-next-line no-param-reassign -- we want to add to the accumulator
    modes[viewportName] = { viewport: viewportName };
    return modes;
  }, {});
}

// Converts the given list of viewports into the viewports
// config object needed for the Storybook parameters.
function buildStoryViewportsConfig(viewports: Viewport[]) {
  return viewports.reduce((viewportsConfig: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);
    // eslint-disable-next-line no-param-reassign -- we want to add to the accumulator
    viewportsConfig[viewportName] = {
      name: viewportName,
      styles: {
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
      },
    };
    return viewportsConfig;
  }, {});
}

// Finds a viewport to use as the default.
function findDefaultViewport(viewports: Viewport[]) {
  // It's hard to know which to use as the default,
  // so let's just go with the widest for now.
  const compareFn = (vp1: Viewport, vp2: Viewport) => {
    if (vp1.width < vp2.width) {
      return 1;
    }
    if (vp1.width > vp2.width) {
      return -1;
    }
    return 0;
  };

  return viewports.sort(compareFn)[0];
}
