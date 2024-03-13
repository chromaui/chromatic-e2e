import fsPromises from 'fs/promises';
import fs from 'fs';
import {
  archivesDir,
  assetsDir,
  ensureDir,
  readJSONFile,
  outputFile,
  outputJSONFile,
} from './filePaths';

jest.mock('fs');
jest.mock('fs/promises');

const currentDir = '/base/dir';
const originalProcess = process;

afterEach(() => {
  global.process = originalProcess;
  jest.resetAllMocks();
});

describe('default output dir', () => {
  beforeEach(() => {
    global.process = {
      ...originalProcess,
      cwd: () => currentDir,
    };
  });

  describe('archivesDir', () => {
    it('returns a full path to the archives dir', async () => {
      const fullPath = archivesDir('default/dir');
      expect(fullPath).toEqual('/base/dir/default/dir/chromatic-archives');
    });
  });

  describe('assetsDir', () => {
    it('returns a full path to the assets dir', async () => {
      const fullPath = assetsDir('default/dir');
      expect(fullPath).toEqual('/base/dir/default/dir/chromatic-archives/archive');
    });
  });
});

describe('overridden output dir', () => {
  beforeEach(() => {
    global.process = {
      ...originalProcess,
      cwd: () => currentDir,
      env: {
        ...originalProcess.env,
        CHROMATIC_ARCHIVE_LOCATION: 'overridden/dir',
      },
    };
  });

  describe('archivesDir', () => {
    it('returns a full path to the archives dir', async () => {
      const fullPath = archivesDir('default/dir');
      expect(fullPath).toEqual('/base/dir/overridden/dir/chromatic-archives');
    });
  });

  describe('assetsDir', () => {
    it('returns a full path to the assets dir', async () => {
      const fullPath = assetsDir('default/dir');
      expect(fullPath).toEqual('/base/dir/overridden/dir/chromatic-archives/archive');
    });
  });
});

describe('ensureDir', () => {
  it('creates the directory if it does not exist', async () => {
    fs.existsSync = jest.fn().mockReturnValueOnce(false);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync').mockReturnValueOnce('');

    ensureDir('/some/path');
    expect(mkdirSpy).toBeCalledWith('/some/path', { recursive: true });
  });

  it('does nothing if directory does exist', async () => {
    fs.existsSync = jest.fn().mockReturnValueOnce(true);
    const mkdirSpy = jest.spyOn(fs, 'mkdirSync');

    ensureDir('/some/path');
    expect(mkdirSpy).not.toBeCalled();
  });
});

describe('outputFile', () => {
  it('writes the given data to the given file', async () => {
    fsPromises.writeFile = jest.fn().mockReturnValueOnce(null);
    await outputFile('/some/path', 'some data');
    expect(fsPromises.writeFile).toHaveBeenCalledWith('/some/path', 'some data', { mode: 511 });
  });
});

describe('outputJSONFile', () => {
  it('writes the given JSON data to the given file', async () => {
    fsPromises.writeFile = jest.fn().mockReturnValueOnce(null);
    await outputJSONFile('/some/path', { data: 'some data ' });
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      '/some/path',
      JSON.stringify({ data: 'some data ' }),
      { mode: 511 }
    );
  });
});

describe('readJSONFile', () => {
  it('returns the contents of the file parsed as JSON', async () => {
    fsPromises.readFile = jest.fn().mockImplementationOnce((filePath) => {
      return Buffer.from(JSON.stringify({ filePath }));
    });
    const json = await readJSONFile('/some/path');
    expect(json).toEqual({ filePath: '/some/path' });
  });
});
