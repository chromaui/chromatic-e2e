import { readdir } from 'fs/promises';
import { Viewport, parseViewport, viewportToString } from '../utils/viewport';
import { sanitize } from './storybook-sanitize';
import { MAX_FILE_NAME_LENGTH, truncateFileName } from '../utils/filePaths';

const SNAPSHOT_FILE_EXT = 'snapshot.json';

export function snapshotId(testTitle: string, snapshotName: string) {
  const fullSnapshotId = `${sanitize(testTitle)}-${sanitize(snapshotName)}`;
  // Leave room for the viewport and extension that will be added when using this
  // to create a full file path
  const maxLength = MAX_FILE_NAME_LENGTH - 25;
  return truncateFileName(fullSnapshotId, maxLength);
}

// NOTE: This is duplicated in the shared storybook preview.ts
// eslint-disable-next-line @typescript-eslint/no-shadow
export function snapshotFileName(snapshotId: string, viewport: Viewport) {
  const fileNameParts = [snapshotId, viewportToString(viewport), SNAPSHOT_FILE_EXT];

  return fileNameParts.join('.');
}

// Parses snapshot ID from full snapshot file name.
export function snapshotIdFromFileName(fileName: string) {
  const fileParts = fileName.split('.');
  return fileParts.slice(0, fileParts.length - 3).join('.'); // .viewport.snapshot.json
}

// Parses viewport from full snapshot file name.
export function viewportFromFileName(fileName: string) {
  const fileParts = fileName.split('.');
  const viewportStr = fileParts[fileParts.length - 3]; // .viewport.snapshot.json
  return parseViewport(viewportStr);
}

export async function listSnapshotFiles(snapshotsDir: string): Promise<string[]> {
  const files = await readdir(snapshotsDir);
  return files.filter((file) => file.endsWith(`.${SNAPSHOT_FILE_EXT}`));
}
