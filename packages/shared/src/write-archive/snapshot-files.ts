import { Viewport, viewportToString } from '../utils/viewport';
import { sanitize } from './storybook-sanitize';
import { MAX_FILE_NAME_BYTE_LENGTH, truncateFileName } from '../utils/filePaths';

const SNAPSHOT_FILE_EXT = 'snapshot.json';

export function snapshotId(testTitle: string, snapshotName: string) {
  const fullSnapshotId = `${sanitize(testTitle)}-${sanitize(snapshotName)}`;
  // Leave room for the viewport and extension that will be added when using this
  // to create a full file path
  const maxByteLength = MAX_FILE_NAME_BYTE_LENGTH - 25;
  return truncateFileName(fullSnapshotId, maxByteLength);
}

// NOTE: This is duplicated in the shared storybook preview.ts
export function snapshotFileName(snapshotId: string, viewport: Viewport) {
  const fileNameParts = [snapshotId, viewportToString(viewport), SNAPSHOT_FILE_EXT];

  return fileNameParts.join('.');
}
