import { outputJSON, readJSON } from 'fs-extra';
import path from 'path';
import { archivesDir, assetsDir } from '../utils/filePaths';
import { Viewport, viewportToString } from '../utils/viewport';
import {
  listSnapshotFiles,
  snapshotIdFromFileName,
  viewportFromFileName,
} from '../write-archive/snapshot-files';
import { addViewportsToStories, listStoriesFiles } from '../write-archive/stories-files';

// Adds mode and viewport config parameters to all stories files
export async function addViewportsToStoriesFiles(defaultOutputDir: string) {
  const snapshotsDir = assetsDir(defaultOutputDir);
  const snapshotFileNames = await listSnapshotFiles(snapshotsDir);
  const viewportsLookup = buildSnapshotViewportsLookup(snapshotFileNames);

  const storiesDir = archivesDir(defaultOutputDir);
  const storiesFilePaths = (await listStoriesFiles(storiesDir)).map((storiesFileName) =>
    path.resolve(storiesDir, storiesFileName)
  );

  await Promise.all(
    storiesFilePaths.map(async (storiesFilePath) => {
      const storiesFileJson = await readJSON(storiesFilePath);
      const storiesWithViewports = addViewportsToStories(storiesFileJson, viewportsLookup);
      await outputJSON(storiesFilePath, storiesWithViewports);
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
