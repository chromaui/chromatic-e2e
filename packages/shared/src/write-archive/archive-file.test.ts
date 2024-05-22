import { ArchiveFile } from './archive-file';
import type { ArchiveResponse, UrlString } from '../resource-archive';

const imgPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const response = {
  statusCode: 200,
  statusText: 'ok',
  body: Buffer.from(imgPng, 'base64'),
  contentType: 'image/png',
};

describe('ArchiveFile', () => {
  const createArchiveFile = (fileUrl: UrlString, archiveResponse: ArchiveResponse = response) => {
    return new ArchiveFile(fileUrl, archiveResponse, 'http://localhost:333');
  };

  describe('toFileSystemPath', () => {
    it('has no effect on valid paths', () => {
      const archiveFile = createArchiveFile('http://localhost:333/some/directory/hi.png');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/hi.png');
    });

    it('ensures path is not a directory', () => {
      const archiveFile = createArchiveFile('http://localhost:333/some/directory/');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/index.html');
    });

    it('appends encoded query string to file name', () => {
      const archiveFile = createArchiveFile(
        'http://localhost:333/some/directory/img?src=https://someotherdomain.com/image.jpg'
      );

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toMatch(new RegExp('/some/directory/img-[a-z0-9]+.png'));
    });

    it('truncates long file names and path parts', () => {
      const archiveFile = createArchiveFile('http://localhost:333/some/directory/ok.jpg');
      archiveFile.shortenedFileNameLength = 5;

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/direc/ok.jp');
    });

    it('adds a file extension based on content type when there is not one already', () => {
      const archiveFile = createArchiveFile('http://localhost:333/some/directory/ok');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/ok.png');
    });

    it('does not add a file extension when response has no content type', () => {
      const noContentType = { ...response };
      delete noContentType.contentType;

      const archiveFile = createArchiveFile(
        'http://localhost:333/some/directory/ok',
        noContentType
      );

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/ok');
    });

    it('prepends domain name (if archiving additional domains)', () => {
      const archiveFile = createArchiveFile('http://subdomain.some-other-host/some-path/me.png');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/subdomain.some-other-host/some-path/me.png');
    });

    it('prepends domain name if port is all that differs', () => {
      const archiveFile = createArchiveFile('http://localhost:9999/some/directory/hi.png');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/localhost3A9999/some/directory/hi.png');
    });

    it('appends encoded string to reserved SB files', () => {
      const archiveFile = createArchiveFile('http://localhost:333/index.json');

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toMatch(new RegExp('/index-[a-z0-9]+.json'));
    });
    screenX;
  });

  describe('originalSrc', () => {
    it('retains the original source from the asset URL', () => {
      const archiveFile = createArchiveFile(
        'http://localhost:333/some/directory/ok?src=some-other-url'
      );

      archiveFile.toFileSystemPath();
      const originalSrc = archiveFile.originalSrc();

      expect(originalSrc).toEqual('http://localhost:333/some/directory/ok?src=some-other-url');
    });

    it('retains the domain from the asset URL if cross-domain', () => {
      const archiveFile = createArchiveFile('http://subdomain.some-other-host/some-path/me.png');

      archiveFile.toFileSystemPath();
      const originalSrc = archiveFile.originalSrc();

      expect(originalSrc).toEqual('http://subdomain.some-other-host/some-path/me.png');
    });
  });
});
