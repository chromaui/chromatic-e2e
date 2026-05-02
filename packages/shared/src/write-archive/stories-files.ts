import type { ChromaticStorybookParameters, DOMSnapshots } from '../types';
import { snapshotId } from './snapshot-files';
import { sanitize } from './storybook-sanitize';
import { Viewport, viewportToString } from '../utils/viewport';
import { MAX_FILE_NAME_BYTE_LENGTH, truncateFileName } from '../utils/filePaths';

const STORIES_FILE_EXT = 'stories.json';
export const SNAPSHOT_ID_GLOBAL = '__chromatic_snapshotId';

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
  chromaticStorybookParams: ChromaticStorybookParameters,
  storyName?: string
) {
  if (storyName) {
    const entries = Object.entries(domSnapshots);
    const firstSnapshotName = entries[0]?.[0];
    if (!firstSnapshotName) throw new Error('Cannot create a story without snapshots');

    const viewports = entries.map(([, { viewport }]) => viewport);
    const storySnapshotTitle = snapshotTitle(title, storyName);
    const defaultViewport = findDefaultViewport(viewports);
    const defaultSnapshotName =
      entries.find(
        ([, { viewport }]) =>
          viewport.width === defaultViewport.width && viewport.height === defaultViewport.height
      )?.[0] || firstSnapshotName;

    return {
      title,
      stories: [
        {
          name: storyName,
          parameters: {
            server: { id: snapshotId(storySnapshotTitle, defaultSnapshotName) },
            chromatic: {
              ...chromaticStorybookParams,
              modes: buildSnapshotModesConfig(storySnapshotTitle, domSnapshots),
            },
            viewport: {
              viewports: buildStoryViewportsConfig(viewports),
              defaultViewport: viewportToString(defaultViewport),
            },
          },
        },
      ],
    };
  }

  return {
    title,
    stories: Object.entries(domSnapshots).map(([name, { viewport }]) => ({
      name,
      parameters: {
        server: { id: snapshotId(title, name) },
        chromatic: {
          ...chromaticStorybookParams,
          modes: buildStoryModesConfig([viewport]),
        },
        viewport: {
          viewports: buildStoryViewportsConfig([viewport]),
          defaultViewport: viewportToString(findDefaultViewport([viewport])),
        },
      },
    })),
  };
}

export function snapshotTitle(title: string, storyName?: string) {
  return storyName ? `${title}/${storyName}` : title;
}

export function buildSnapshotModesConfig(title: string, domSnapshots: DOMSnapshots) {
  return Object.entries(domSnapshots).reduce((modes: any, [name, { viewport }]) => {
    // The Storybook server JSON loader emits mode keys into a JS object literal.
    // Pre-quoting keeps names like "Light mobile" valid while preserving the runtime key.
    modes[JSON.stringify(name)] = {
      viewport: viewportToString(viewport),
      [SNAPSHOT_ID_GLOBAL]: snapshotId(title, name),
    };
    return modes;
  }, {});
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

// Converts the given list of viewports into the viewports
// config object needed for the Storybook parameters.
export function buildStoryViewportsConfig(viewports: Viewport[]) {
  return viewports.reduce((viewportsConfig: any, viewport: Viewport) => {
    const viewportName = viewportToString(viewport);

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
