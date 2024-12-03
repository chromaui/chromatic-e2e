import { readdir } from 'fs/promises';
import { ChromaticStorybookParameters } from '../types';
import { snapshotId } from './snapshot-files';
import { sanitize } from './storybook-sanitize';
import { Viewport, viewportToString } from '../utils/viewport';
import { MAX_FILE_NAME_BYTE_LENGTH, truncateFileName } from '../utils/filePaths';

const STORIES_FILE_EXT = 'stories.json';

// Generates a file-system-safe file name from a story title
export function storiesFileName(testTitle: string) {
  const fileName = [sanitize(testTitle), STORIES_FILE_EXT].join('.');
  // Leave room for built storybook extensions that may be added (like `-stories.iframe.bundle.js`)
  const maxByteLength = MAX_FILE_NAME_BYTE_LENGTH - 25;
  return truncateFileName(fileName, maxByteLength);
}

// Converts the DOM snapshots into a JSON stories file.
export function createStories(
  title: string,
  domSnapshots: Record<string, Buffer>,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  return {
    title,
    stories: Object.keys(domSnapshots).map((name) => ({
      name,
      parameters: {
        server: { id: snapshotId(title, name) },
        chromatic: {
          ...chromaticStorybookParams,
        },
      },
    })),
  };
}

export function addViewportsToStories(
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
          viewports: buildStoryViewportsConfig(viewports),
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

export async function listStoriesFiles(storiesDir: string) {
  const files = await readdir(storiesDir);
  return files.filter((file) => file.endsWith(`.${STORIES_FILE_EXT}`));
}

// Converts the given list of viewports into the modes
// config object needed for the Storybook parameters.
export function buildStoryModesConfig(viewports: Viewport[]) {
  return viewports.reduce((modes: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);
    // eslint-disable-next-line no-param-reassign -- we want to add to the accumulator
    modes[viewportName] = { viewport: viewportName };
    return modes;
  }, {});
}

// Converts the given list of viewports into the viewports
// config object needed for the Storybook parameters.
export function buildStoryViewportsConfig(viewports: Viewport[]) {
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
export function findDefaultViewport(viewports: Viewport[]) {
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
