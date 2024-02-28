import { archivesDir, assetsDir } from './filePaths';

const currentDir = '/base/dir';
const originalProcess = process;

afterEach(() => {
  global.process = originalProcess;
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
