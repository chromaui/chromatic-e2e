import fs from 'fs/promises';
import * as snapshotFiles from './snapshot-files';

jest.mock('fs/promises');

beforeEach(() => {
  jest.resetAllMocks();
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

describe('snapshotIdFromFileName', () => {
  it('parses a snapshot ID from a snapshot file name', () => {
    const snapshotId = snapshotFiles.snapshotIdFromFileName('some-id.w500h720.snapshot.json');

    expect(snapshotId).toEqual('some-id');
  });
});

describe('viewportFromFileName', () => {
  it('parses a viewport from a snapshot file name', () => {
    const viewport = snapshotFiles.viewportFromFileName('some-id.w500h720.snapshot.json');

    expect(viewport).toEqual({ width: 500, height: 720 });
  });
});

describe('listSnapshotFiles', () => {
  it('lists snapshot files in a given directory', async () => {
    const allFiles = [
      'some-id.w500h720.snapshot.json',
      'not-a-snap.txt',
      'some-id.w1200h820.snapshot.json',
      'not-a-snapshot.json',
    ];
    fs.readdir = jest.fn().mockResolvedValueOnce(allFiles);
    const files = await snapshotFiles.listSnapshotFiles('some-dir');

    expect(files).toEqual(['some-id.w500h720.snapshot.json', 'some-id.w1200h820.snapshot.json']);
  });
});
