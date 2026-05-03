import type { ChromaticStorybookParameters, DOMSnapshots } from '../types';
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
  domSnapshots: DOMSnapshots,
  chromaticStorybookParams: ChromaticStorybookParameters
) {
  return {
    title,
    stories: Object.entries(domSnapshots).map(([name, { viewport }]) => ({
      name,
      // Viewport addon (Storybook 10+): `parameters.viewport.options` registers sizes; `globals.viewport`
      // selects the active one. See https://storybook.js.org/docs/essentials/viewport#defining-the-viewport-for-a-story
      // `defaultViewport` is not read by SB 10's types but our archive preview uses it as a fetch fallback.
      globals: { viewport: viewportToString(viewport) },
      parameters: {
        server: { id: snapshotId(title, name) },
        chromatic: {
          ...chromaticStorybookParams,
          modes: buildStoryModesConfig([viewport]),
        },
        viewport: {
          options: buildStoryViewportsConfig([viewport]),
          defaultViewport: viewportToString(findDefaultViewport([viewport])),
        },
      },
    })),
  };
}

// Converts the given list of viewports into the modes
// config object needed for the Storybook parameters.
export function buildStoryModesConfig(viewports: Viewport[]) {
  return viewports.reduce((modes: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);

    modes[viewportName] = { viewport: viewportName };
    return modes;
  }, {});
}

// Converts the given list of viewports into Storybook 10 `parameters.viewport.options`.
export function buildStoryViewportsConfig(viewports: Viewport[]) {
  return viewports.reduce((viewportsConfig: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);

    viewportsConfig[viewportName] = {
      name: viewportName,
      type: viewportAddonType(viewport),
      styles: {
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
      },
    };
    return viewportsConfig;
  }, {});
}

function viewportAddonType(viewport: Viewport): 'mobile' | 'tablet' | 'desktop' | 'other' {
  if (viewport.width < 600) {
    return 'mobile';
  }
  if (viewport.width < 1024) {
    return 'tablet';
  }
  return 'desktop';
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
