import mime from 'mime';
import path from 'path';
import { createHash } from 'node:crypto';
import { logger } from '../utils/logger';
import type { ArchiveResponse, UrlString } from '../resource-archive';

const RESERVED_PATHNAMES: string[] = [
  // This is a list of filenames that are reserved for Storybook as a dev target.
  // If we encounter these filenames, we will rename them to avoid collisions.
  // If we do not rename them, the build-archive-storybook will not be able to serve the correct archives
  // and the tests will fail.
  '/index.json',
  '/iframe.html',
  '/index.html',
  '/main.iframe.bundle.js',
  '/runtime~main.iframe.bundle.js',
  '/sb-preview/runtime.js',
];

/**
 * Handles converting the full URL of assets loaded during a test
 * captured in the resource archive into a file system friendly path so
 * that they can be safely written to the file system.
 *
 * This includes:
 * - ensuring the path has a file name to avoid colliding with a directory
 * - encoding the query string into the file name to avoid overwriting files
 *   that have a different response due to the query string
 * - truncating file names and path parts that are too big for some file systems
 * - removing problematic characters
 * - ensuring the file name has an extension
 */
export class ArchiveFile {
  // The URL to the asset being archived.
  url: URL;

  response: ArchiveResponse;

  shortenedFileNameLength: number;

  // The URL to page being tested.
  pageUrl: URL;

  constructor(url: UrlString, response: ArchiveResponse, pageUrl: UrlString) {
    this.url = new URL(url);
    this.response = response;
    this.shortenedFileNameLength = 250;
    this.pageUrl = new URL(pageUrl);
  }

  originalSrc() {
    return this.url.toString();
  }

  toFileSystemPath() {
    let sanitizedSrc = this.url.pathname;

    sanitizedSrc = this.preserveExternalDomain();
    sanitizedSrc = this.ensureNonDirectory(sanitizedSrc);
    sanitizedSrc = this.encodeQueryString(sanitizedSrc);
    sanitizedSrc = this.truncateFileName(sanitizedSrc);
    sanitizedSrc = this.removeSpecialChars(sanitizedSrc);
    sanitizedSrc = this.renameReservedPathnames(sanitizedSrc);
    sanitizedSrc = this.addExtension(sanitizedSrc);

    return sanitizedSrc;
  }

  private ensureNonDirectory(pathname: string) {
    return pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  }

  private encodeQueryString(pathname: string) {
    const queryString = this.url.search;
    if (!queryString) return pathname;

    const safeQueryString = this.hash(queryString);
    return `${pathname}-${safeQueryString}`;
  }

  private truncateFileName(pathname: string) {
    // Split this path to get all of the pieces
    const pathPieces = pathname.split('/');
    const rebuiltPieces: Array<string> = [];

    // Shorten each individual piece
    pathPieces.forEach((piece, index) => {
      let shortName: string = piece;
      if (piece.length > this.shortenedFileNameLength) {
        shortName = piece.substring(0, this.shortenedFileNameLength);
        logger.log(`Chunk of filename '${piece}' is too long. Shortening to '${shortName}'`);
      }

      rebuiltPieces.push(shortName);
    });

    // Re-join the pieces
    return `${pathname.startsWith('/') ? '/' : ''}${path.join(...rebuiltPieces)}`;
  }

  private removeSpecialChars(pathname: string) {
    // The storybook server seems to have a problem with percents in file names
    return pathname.replace(/[%]/g, '');
  }

  private addExtension(pathname: string) {
    if ('error' in this.response) return pathname;

    // Add an extension if needed
    let nameWithExtension = pathname;
    if (!path.extname(nameWithExtension)) {
      const fileExtension = mime.getExtension(this.response.contentType) || 'tmp';
      nameWithExtension = `${pathname}.${fileExtension}`;
    }

    return nameWithExtension;
  }

  private preserveExternalDomain() {
    if (this.url.origin === this.pageUrl.origin) {
      return this.url.pathname;
    }

    // Windows doesn't support colons in file names
    const encodedHost = encodeURIComponent(this.url.host);

    return `/${encodedHost}/${this.url.pathname}`;
  }

  private hash(name: string) {
    return createHash('md5').update(name).digest('hex');
  }

  private renameReservedPathnames(pathname: string) {
    if (this.url.origin === this.pageUrl.origin && RESERVED_PATHNAMES.includes(pathname)) {
      const hash = this.hash(this.url.toString());
      const basename = path.basename(pathname, path.extname(pathname));
      return `${path.dirname(pathname)}/${basename}-${hash}${path.extname(pathname)}`;
    }

    return pathname;
  }
}
