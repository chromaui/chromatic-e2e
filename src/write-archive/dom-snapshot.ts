import type { serializedNodeWithId } from '@chromaui/rrweb-snapshot';
import { NodeType } from '@chromaui/rrweb-snapshot';

/**
 * TODO rrweb flavored dom snapshot
 */
export class DOMSnapshot {
  snapshot: serializedNodeWithId;

  constructor(snapshot: Buffer | string) {
    // TODO do we need to handle string here?
    if (Buffer.isBuffer(snapshot)) {
      const bufferAsString = snapshot.toString('utf-8');
      this.snapshot = JSON.parse(bufferAsString);
    } else {
      this.snapshot = JSON.parse(snapshot);
    }
  }

  async mapSourceEntries(sourceMap: Map<string, string>) {
    const transformedSnapshot = await this.mapNode(this.snapshot, sourceMap);
    return JSON.stringify(transformedSnapshot);
  }

  private async mapNode(node: serializedNodeWithId, sourceMap: Map<string, string>) {
    if (node.type === NodeType.Element) {
      if (node.attributes && node.attributes.src) {
        const sourceVal = node.attributes.src as string;
        if (sourceMap.has(sourceVal)) {
          // eslint-disable-next-line no-param-reassign
          node.attributes.src = sourceMap.get(sourceVal);
        }
      }
    }

    if ('childNodes' in node) {
      // eslint-disable-next-line no-param-reassign
      node.childNodes = await Promise.all(
        node.childNodes.map(async (childNode) => {
          return this.mapNode(childNode, sourceMap);
        })
      );
    }

    return node;
  }
}
