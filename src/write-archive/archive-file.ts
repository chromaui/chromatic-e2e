import mime from 'mime';
import path from 'path';
import { createHash } from 'node:crypto';
import { logger } from '../utils/logger';
import type { ArchiveResponse, UrlString } from '../resource-archive';

export class ArchiveFile {
  url: URL;

  response: ArchiveResponse;

  shortenedFileNameLength: number;

  constructor(url: UrlString, response: ArchiveResponse) {
    this.url = new URL(url);
    this.response = response;
    this.shortenedFileNameLength = 250;
  }

  originalSrc() {
    // Assets that we capture will be stripped of the domain in the source
    return `${this.url.pathname}${this.url.search}`;
  }

  toFileSystemPath() {
    let sanitizedSrc = this.url.pathname;

    sanitizedSrc = this.ensureNonDirectory(sanitizedSrc);
    sanitizedSrc = this.encodeQueryString(sanitizedSrc);
    sanitizedSrc = this.truncateFileName(sanitizedSrc);
    sanitizedSrc = this.addExtension(sanitizedSrc);

    return sanitizedSrc;
  }

  private ensureNonDirectory(pathname: string) {
    // TODO maybe drop the .html?
    return pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  }

  private encodeQueryString(pathname: string) {
    const queryString = this.url.search;
    if (!queryString) return pathname;

    // TODO maybe prepend the last file name in case it has an extension?
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
      const fileExtension = mime.getExtension(this.response.contentType.value);
      if (fileExtension) {
        nameWithExtension = `${pathname}.${fileExtension}`;
      }
    }

    return nameWithExtension;
  }

  private hash(name: string) {
    return createHash('md5').update(name).digest('hex');
  }
}
