import fsPromises from 'fs/promises';
import fs from 'fs';
import {
  archivesDir,
  assetsDir,
  ensureDir,
  outputFile,
  outputJSONFile,
  readJSONFile,
  truncateFileName,
} from './filePaths';
import { removeLocalhostFromBaseUrl } from './filePaths';

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

describe('truncateFileName', () => {
  it('does nothing if file name is within valid length', () => {
    const filePath = 'this/is/a/valid.file.length';

    const truncated = truncateFileName(filePath);

    expect(truncated).toEqual(filePath);
    expect(truncated.split('/').at(-1)).toEqual('valid.file.length');
  });

  it('ignores length of path parts before the file name', () => {
    const encoder = new TextEncoder();
    const filePath =
      '/a/bunch/of/paths/that/donot/affect-size/this-title-has-260-chars-exactly-i-know-because-i-counted-and-that-is-too-big-for-a-file-system-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-b-ok-this-right-here-this-is-the-end.js';
    const filePathLength = encoder.encode(filePath).byteLength;
    expect(filePathLength).toBeGreaterThan(255);

    const truncated = truncateFileName(filePath);

    expect(encoder.encode(truncated.split('/').at(-1)).byteLength).toEqual(255);
    expect(truncated).toMatch(
      new RegExp(
        '^/a/bunch/of/paths/that/donot/affect-size/this-title-.*ok-this-right-here-this-i[a-z0-9]{4}.js$'
      )
    );
  });

  it('truncates long file names without changing extension', () => {
    const encoder = new TextEncoder();
    const fileName =
      'this-title-has-260-bytes-exactly-i-know-because-i-counted-and-that-is-too-big-for-a-file-system-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-b-ok-this-right-here-this-is-the-end.js';
    const fileNameLength = encoder.encode(fileName).byteLength;
    expect(fileNameLength).toBeGreaterThan(255);

    const truncated = truncateFileName(fileName);
    const truncatedLength = encoder.encode(truncated).byteLength;

    expect(truncatedLength).toEqual(255);
    expect(truncated).toMatch(new RegExp('^this-title-.*ok-this-right-here-this-i[a-z0-9]{4}.js$'));
  });

  it('correctly truncates file names with multi-byte characters', () => {
    const encoder = new TextEncoder();
    const fileName =
      'このタイトルは260byteあります-私が数えたので間違いないです-そしてそれはファイルシステムにとっては大きすぎます-ああだこうだ-ああだこうだ-ああだこうだ-ああだこうだ-これで終わりです.js';
    const fileNameLength = encoder.encode(fileName).byteLength;
    expect(fileNameLength).toBeGreaterThan(255);

    const truncated = truncateFileName(fileName);
    const truncatedLength = encoder.encode(truncated).byteLength;

    expect(truncatedLength).toEqual(255);
    expect(truncated).toMatch(
      new RegExp('^このタイトルは260byteあります-.*-ああだこうだ-これで終[a-z0-9]{4}.js$')
    );
  });

  it('truncates long file names without changing multiple extensions', () => {
    const encoder = new TextEncoder();
    const fileName =
      'this-title-has-260-bytes-exactly-i-know-because-i-counted-and-that-is-too-big-for-a-file-system-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-b-ok-this-right-here-this-is-the-end.one.js';
    const fileNameLength = encoder.encode(fileName).byteLength;
    expect(fileNameLength).toBeGreaterThan(255);

    const truncated = truncateFileName(fileName);
    const truncatedLength = encoder.encode(truncated).byteLength;

    expect(truncatedLength).toEqual(255);
    expect(truncated).toMatch(new RegExp('^this-title-.*ok-this-right-here-th[a-z0-9]{4}.one.js$'));
  });

  it('truncates long names without an extension', () => {
    const encoder = new TextEncoder();
    const fileName =
      'this-title-has-260-bytes-exactly-i-know-because-i-counted-and-that-is-too-big-for-a-file-system-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-b-ok-this-right-here-this-is-the-end';
    const fileNameLength = encoder.encode(fileName).byteLength;
    expect(fileNameLength).toBeGreaterThan(255);

    const truncated = truncateFileName(fileName);
    const truncatedLength = encoder.encode(truncated).byteLength;

    expect(truncatedLength).toEqual(255);
    expect(truncated).toMatch(new RegExp('^this-title-.*ok-this-right-here-this-is-t[a-z0-9]{4}$'));
  });

  it('truncates long names to given size', () => {
    const encoder = new TextEncoder();
    const fileName =
      'this-title-has-260-bytes-exactly-i-know-because-i-counted-and-that-is-too-big-for-a-file-system-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-blah-b-ok-this-right-here-this-is-the-end';
    const fileNameLength = encoder.encode(fileName).byteLength;
    expect(fileNameLength).toBeGreaterThan(255);

    const truncated = truncateFileName(fileName, 100);
    const truncatedLength = encoder.encode(truncated).byteLength;

    expect(truncatedLength).toEqual(100);
    expect(truncated).toMatch(new RegExp('^this-title-.*-a-file-system-[a-z0-9]{4}$'));
  });
  describe('removeLocalhostFromBaseUrl', () => {
    it('should remove localhost from href but keeps the relative path', () => {
      const href = 'http://localhost:3000/some/path/';
      const result = removeLocalhostFromBaseUrl(href);
      expect(result).toBe('/some/path/');
    });

    it('should remove localhost from href but keeps the search and hash paramters', () => {
      const href = 'http://localhost:3000/some/path/?query=value#fragment';
      const result = removeLocalhostFromBaseUrl(href);
      expect(result).toBe('/some/path/?query=value#fragment');
    });

    it('should remove localhost from href', () => {
      const href = 'http://localhost:3000/';
      const result = removeLocalhostFromBaseUrl(href);
      expect(result).toBe('/');
    });

    it('should return the exact href if it is already relative', () => {
      const href = '/some/path/';
      const result = removeLocalhostFromBaseUrl(href);
      expect(result).toBe('/some/path/');
    });

    it('should return the exact href if locahost is not the host name', () => {
      const href = 'https://www.example.com/';
      const result = removeLocalhostFromBaseUrl(href);
      expect(result).toBe(href);
    });
  });
});
