import { readdir } from 'fs/promises';
import { ChromaticStorybookParameters } from '../types';
import { snapshotId } from './snapshot-files';
import { sanitize } from './storybook-sanitize';

const STORIES_FILE_EXT = 'stories.json';

export function storiesFileName(testTitle: string) {
  const fileNameParts = [sanitize(testTitle), STORIES_FILE_EXT];

  return fileNameParts.join('.');
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

export async function listStoriesFiles(storiesDir: string) {
  const files = await readdir(storiesDir);
  return files.filter((file) => file.endsWith(`.${STORIES_FILE_EXT}`));
}
