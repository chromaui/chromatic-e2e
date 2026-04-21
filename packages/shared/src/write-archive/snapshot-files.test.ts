import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as snapshotFiles from './snapshot-files';

vi.mock('fs/promises');

beforeEach(() => {
  vi.resetAllMocks();
});

describe('snapshotId', () => {
  it('sanitizes the snapshot ID', () => {
    const snapshotId = snapshotFiles.snapshotId(
      'a title *() with $%& chars',
      'a snapshot name *() with $%& chars'
    );

    expect(snapshotId).toEqual('a-title-with-chars-a-snapshot-name-with-chars');
  });

  it('truncates long snashot IDs', () => {
    const title =
      'this title has 260 chars exactly i know because i counted and that is too big for a file system blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah ok this right here this is the end';
    const snapshotName = 'and this is a snapshot name these should not be too long usually';

    const snapshotId = snapshotFiles.snapshotId(title, snapshotName);

    expect(snapshotId.length).toEqual(230);
    expect(snapshotId).toMatch(new RegExp('^this-title-has-.*blah-blah-[a-z0-9]{4}$'));
  });
});

describe('snapshotFileName', () => {
  it('generates a filename with the id and viewport', () => {
    const fileName = snapshotFiles.snapshotFileName('some-id', { width: 500, height: 720 });

    expect(fileName).toEqual('some-id.w500h720.snapshot.json');
  });
});
