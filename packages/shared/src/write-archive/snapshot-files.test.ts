import fs from 'fs/promises';
import * as snapshotFiles from './snapshot-files';

jest.mock('fs/promises');

beforeEach(() => {
  jest.resetAllMocks();
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
