import type { elementNode, serializedNodeWithId } from '@chromaui/rrweb-snapshot';
import { NodeType } from '@chromaui/rrweb-snapshot';
import path from 'path';
import { logger } from './logger';

/**
 * A builder class that allows us to transform "src" entries within dom snapshots output
 * by `rrweb-snapshot`. This is done for post-processing of the data to avoid issues
 * where the "src" entry would not work well with the underlying file system.
 */
export class SourceMapper {
  private domSnapshot: elementNode;

  private shortenedFileNameLength: number;

  /**
   * Create a new {@link SourceMapper} object at a given root node.
   *
   * @param domSnapshot The {@link elementNode} where processing should start. This can be the dom
   * snapshot that's retrieved when `rrweb-snapshot` is first invoked.
   */
  constructor(domSnapshot: elementNode) {
    this.domSnapshot = domSnapshot;
    this.shortenedFileNameLength = -1;
  }

  /**
   * Specify a maximum length, in bytes, that any individual source path component can be.
   *
   * Note: Since "src" entries are assumed to be URIs (either in absolute or relative form),
   * the separator for individual path components will always be '/'.
   *
   * @param maxLength A {@link number} that specifies the maximum number of bytes that can
   * be used for each individual path component within an initial "src" entry.
   *
   * @returns `this`, the {@link SourceMapper} object upon which the method was called, for chaining.
   */
  shortenFileNamesLongerThan(maxLength: number): SourceMapper {
    this.shortenedFileNameLength = maxLength;

    return this;
  }

  /**
   * Perform all scheduled post-processing and retrieve the mapping of source entries.
   *
   * @returns A {@link Map} of src entries, as they show up in the original dom snapshot data, to the
   * transformed versions we need to use.
   */
  build(): Map<string, string> {
    const sourceMap = new Map<string, string>();
    if (this.shortenedFileNameLength > 0 && this.domSnapshot.childNodes) {
      return this.shortenFileNameSourceRecursive(this.domSnapshot.childNodes, sourceMap);
    }

    return sourceMap;
  }

  private shortenFileNameSourceRecursive(
    input: Array<serializedNodeWithId>,
    existingSourceMap: Map<string, string>
  ): Map<string, string> {
    // eslint-disable-next-line no-restricted-syntax
    for (const nextChildNode of input) {
      if ('attributes' in nextChildNode && 'src' in nextChildNode.attributes) {
        const srcAsString: string = nextChildNode.attributes.src as string;

        // Split this path to get all of the pieces
        const pathPieces = (nextChildNode.attributes.src as string).split('/');
        const rebuiltPieces: Array<string> = [];
        // Shorten each individual piece
        pathPieces.forEach((piece, index) => {
          const stringBuffer = Buffer.from(piece);
          let shortName: string = piece;
          if (stringBuffer.length > this.shortenedFileNameLength) {
            shortName = stringBuffer.toString('utf-8', 0, this.shortenedFileNameLength);
            logger.log(
              `Chunk of filename '${stringBuffer}' is too long. Shortening to '${shortName}'`
            );
          }

          rebuiltPieces.push(shortName);
        });

        // Re-join the pieces and put this into the map
        const shortenedPath = `${srcAsString.startsWith('/') ? '/' : ''}${path.join(
          ...rebuiltPieces
        )}`;
        existingSourceMap.set(srcAsString, shortenedPath);
      }

      if (nextChildNode.type === NodeType.Element) {
        const childElementNode: elementNode = nextChildNode as elementNode;

        if (childElementNode.childNodes.length !== 0) {
          this.shortenFileNameSourceRecursive(childElementNode.childNodes, existingSourceMap);
        }
      }
    }

    return existingSourceMap;
  }
}
