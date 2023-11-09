import type { elementNode } from '@chromaui/rrweb-snapshot';

/**
 * TODO rrweb flavored dom snapshot
 */
export class DOMSnapshot {
  snapshot: Buffer;

  constructor(snapshot: Buffer) {
    this.snapshot = snapshot;
  }

  async mapSourceEntries(sourceMap: Map<string, string>) {
    const transformedSnapshot = await this.mapNode(this.snapshot, sourceMap);
    return Buffer.from(JSON.stringify(transformedSnapshot));
  }

  async mapNode(domSnapshot: Buffer, sourceMap: Map<string, string>) {
    let jsonBuffer: elementNode;
    if (Buffer.isBuffer(domSnapshot)) {
      const bufferAsString = domSnapshot.toString('utf-8');

      // Try to parse as JSON. Our tests don't always return JSON, so this is kind of a hack
      // to avoid a situation where JSON is expected but not actually given.
      try {
        jsonBuffer = JSON.parse(bufferAsString);
      } catch (err) {
        return domSnapshot;
      }
    } else {
      jsonBuffer = domSnapshot;
    }

    if (jsonBuffer.attributes && jsonBuffer.attributes.src) {
      const sourceVal = jsonBuffer.attributes.src as string;
      if (sourceMap.has(sourceVal)) {
        jsonBuffer.attributes.src = sourceMap.get(sourceVal);
      }
    }

    if (jsonBuffer.childNodes) {
      jsonBuffer.childNodes = await Promise.all(
        jsonBuffer.childNodes.map(async (child) => {
          const jsonString = JSON.stringify(child);
          const mappedSourceEntriesBuffer = await this.mapNode(Buffer.from(jsonString), sourceMap);
          const mappedSourceEntries = JSON.parse(mappedSourceEntriesBuffer.toString('utf-8'));
          return mappedSourceEntries;
        })
      );
    }

    return Buffer.from(JSON.stringify(jsonBuffer));
  }
}
