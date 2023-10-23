import { elementNode, serializedElementNodeWithId } from '@chromaui/rrweb-snapshot';
import { SourceMapper } from './source-mapper';

describe('SourceMapper', () => {
  it('should map a piece of a source that is longer than 5 characters to a truncated version', () => {
    const originalObject: elementNode = {
      childNodes: [
        {
          attributes: {
            src: '/home/on/the/range',
          },
        } as unknown as serializedElementNodeWithId,
      ],
    } as elementNode;

    const sourceMap = new SourceMapper(originalObject).shortenFileNamesLongerThan(4).build();
    const expectedMap = new Map<string, string>();
    expectedMap.set('/home/on/the/range', '/home/on/the/rang');
    expect(sourceMap).toEqual(expectedMap);
  });

  it('should map all pieces of a source that are longer than 12 characters to truncated versions', () => {
    const originalObject: elementNode = {
      childNodes: [
        {
          attributes: {
            src: '/themaninblackfledthrough/the/desert/and/the/gunslingerfollowed',
          },
        } as unknown as serializedElementNodeWithId,
      ],
    } as elementNode;

    const sourceMap = new SourceMapper(originalObject).shortenFileNamesLongerThan(4).build();
    const expectedMap = new Map<string, string>();
    expectedMap.set(
      '/themaninblackfledthrough/the/desert/and/the/gunslingerfollowed',
      '/them/the/dese/and/the/guns'
    );
    expect(sourceMap).toEqual(expectedMap);
  });
});
