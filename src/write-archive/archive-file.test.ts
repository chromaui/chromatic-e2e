import { ArchiveFile } from './archive-file';

const imgPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const response = {
  statusCode: 200,
  statusText: 'ok',
  body: Buffer.from(imgPng, 'base64'),
  contentType: 'image/png',
};

describe('ArchiveFile', () => {
  describe('toFileSystemPath', () => {
    it('has no effect on valid paths', () => {
      const archiveFile = new ArchiveFile('http://localhost:333/some/directory/hi.png', response);

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/hi.png');
    });

    it('ensures path is not a directory', () => {
      const archiveFile = new ArchiveFile('http://localhost:333/some/directory/', response);

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/index.html');
    });

    it('appends encoded query string to file name', () => {
      const archiveFile = new ArchiveFile(
        'http://localhost:333/some/directory/img?src=https://someotherdomain.com/image.jpg',
        response
      );

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toMatch(new RegExp('/some/directory/img-[a-z0-9]+.png'));
    });

    it('truncates long file names and path parts', () => {
      const archiveFile = new ArchiveFile('http://localhost:333/some/directory/ok.jpg', response);
      archiveFile.shortenedFileNameLength = 5;

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/direc/ok.jp');
    });

    it('adds a file extension based on content type when there is not one already', () => {
      const archiveFile = new ArchiveFile('http://localhost:333/some/directory/ok', response);

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/ok.png');
    });

    it('does not add a file extension when response has no content type', () => {
      const noContentType = { ...response };
      delete noContentType.contentType;

      const archiveFile = new ArchiveFile('http://localhost:333/some/directory/ok', noContentType);

      const filePath = archiveFile.toFileSystemPath();

      expect(filePath).toEqual('/some/directory/ok');
    });
  });

  describe('originalSrc', () => {
    it('retains the original source from the asset URL', () => {
      const archiveFile = new ArchiveFile(
        'http://localhost:333/some/directory/ok?src=some-other-url',
        response
      );

      archiveFile.toFileSystemPath();
      const originalSrc = archiveFile.originalSrc();

      expect(originalSrc).toEqual('/some/directory/ok?src=some-other-url');
    });
  });
});
