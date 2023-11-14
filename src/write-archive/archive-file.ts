import mime from 'mime';
import path from 'path';
import { createHash } from 'node:crypto';
import { logger } from '../utils/logger';
import type { ArchiveResponse, UrlString } from '../resource-archive';

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
 * - ensuring the file name has an extension
 */
export class ArchiveFile {
  url: URL;

  response: ArchiveResponse;

  shortenedFileNameLength: number;

  siteUrl: URL;

  constructor(url: UrlString, response: ArchiveResponse, siteUrl: UrlString) {
    this.url = new URL(url);
    this.response = response;
    this.shortenedFileNameLength = 250;
    this.siteUrl = new URL(siteUrl);
  }

  originalSrc() {
    if (this.url.origin === this.siteUrl.origin) {
      // Same-domain assets that we capture will be stripped of the domain in the source
      return `${this.url.pathname}${this.url.search}`;
    }

    return this.url.href;
  }

  toFileSystemPath() {
    let sanitizedSrc = this.url.pathname;

    sanitizedSrc = this.preserveExternalDomain(this.url);
    sanitizedSrc = this.ensureNonDirectory(sanitizedSrc);
    sanitizedSrc = this.encodeQueryString(sanitizedSrc);
    sanitizedSrc = this.truncateFileName(sanitizedSrc);
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

  private addExtension(pathname: string) {
    if ('error' in this.response || !this.response.contentType) return pathname;

    // Add an extension if needed
    let nameWithExtension = pathname;
    if (!path.extname(nameWithExtension)) {
      const fileExtension = mime.getExtension(this.response.contentType);
      if (fileExtension) {
        nameWithExtension = `${pathname}.${fileExtension}`;
      }
    }

    return nameWithExtension;
  }

  private preserveExternalDomain(fullUrl: URL) {
    if (fullUrl.origin === this.siteUrl.origin) {
      return fullUrl.pathname;
    }

    // Windows doesn't support colons in file names
    const encodedHost = encodeURIComponent(fullUrl.host);

    return `/${encodedHost}/${fullUrl.pathname}`;
  }

  private hash(name: string) {
    return createHash('md5').update(name).digest('hex');
  }
}
