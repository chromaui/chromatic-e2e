import { DOMSnapshot } from './dom-snapshot';

const relativeUrl = '/images/image.png';
const externalUrl = 'https://chromatic.com/img';
const queryUrl = '/images/img?src=https://chromatic.com/img';
const queryUrlTransformed = '/images/somehash.png';

function createSnapshot(url1: string, url2: string, url3: string) {
  return `{"type":0,"childNodes":[{"type":1,"name":"html","publicId":"","systemId":"","id":2},{"type":2,"tagName":"html","attributes":{},"childNodes":[{"type":2,"tagName":"head","attributes":{},"childNodes":[{"type":3,"textContent":"    ","id":5},{"type":2,"tagName":"link","attributes":{"rel":"stylesheet","href":"/styles-test.css"},"childNodes":[],"id":6},{"type":3,"textContent":"    ","id":7},{"type":2,"tagName":"style","attributes":{},"childNodes":[{"type":3,"textContent":".test1 { background-image: url(\\"${url1}\\"); }.test2 { background-image: url(\\"${url2}\\"); }.test2 { background-image: url(\\"${url3}\\"); }","isStyle":true,"id":9}],"id":8},{"type":3,"textContent":"  ","id":10}],"id":4},{"type":3,"textContent":"  ","id":11},{"type":2,"tagName":"body","attributes":{},"childNodes":[{"type":3,"textContent":"    ","id":13},{"type":2,"tagName":"div","attributes":{"class":"image-container flex flex-wrap"},"childNodes":[{"type":3,"textContent":"      ","id":15},{"type":2,"tagName":"img","attributes":{"src":"${url1}"},"childNodes":[],"id":16},{"type":3,"textContent":"      ","id":17},{"type":2,"tagName":"img","attributes":{"src":"${url2}"},"childNodes":[],"id":18},{"type":3,"textContent":"      ","id":19},{"type":2,"tagName":"img","attributes":{"src":"${url3}"},"childNodes":[],"id":20},{"type":3,"textContent":"      ","id":21},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url1}'); no-repeat center;"},"childNodes":[],"id":22},{"type":3,"textContent":"      ","id":23},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url2}'); no-repeat center;"},"childNodes":[],"id":24},{"type":3,"textContent":"      ","id":25},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url3}'); no-repeat center;"},"childNodes":[],"id":26},{"type":3,"textContent":"    ","id":27}],"id":14},{"type":3,"textContent":"  ","id":28}],"id":12}],"id":3}],"id":1}`;
}

function createImgSrcsetSnapshot(backupUrl: string, smallUrl: string, largeUrl: string) {
  return JSON.stringify({
    type: 2,
    tagName: 'img',
    attributes: {
      srcset: `${smallUrl} 384w, ${largeUrl} 1920w`,
      sizes: '(min-width: 768px) 768px, 192px',
      src: backupUrl,
    },
    childNodes: [],
    id: 61,
  });
}

function createPictureSrcsetSnapshot(backupUrl: string, smallUrl: string, largeUrl: string) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: largeUrl,
        },
        childNodes: [],
        id: 63,
      },
      {
        type: 2,
        tagName: 'img',
        attributes: {
          src: backupUrl,
        },
        childNodes: [],
        id: 61,
      },
    ],
    id: 62,
  });
}

const snapshot = createSnapshot(relativeUrl, externalUrl, queryUrl);
const expectedMappedSnapshot = createSnapshot(relativeUrl, externalUrl, queryUrlTransformed);

const sourceMap = new Map<string, string>();
sourceMap.set(queryUrl, queryUrlTransformed);

describe('DOMSnapshot', () => {
  describe('mapAssetPaths', () => {
    it('maps asset paths in src attrs, style attrs, and external style sheets, and inline style elements', async () => {
      const domSnapshot = new DOMSnapshot(snapshot);

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(mappedSnapshot).toEqual(expectedMappedSnapshot);
    });

    it('does not change paths that are not in the source map', async () => {
      const domSnapshot = new DOMSnapshot(snapshot);

      const mappedSnapshot = await domSnapshot.mapAssetPaths(new Map<string, string>());

      expect(mappedSnapshot).toEqual(snapshot);
    });

    it('maps img srcsets', async () => {
      const domSnapshot = new DOMSnapshot(
        createImgSrcsetSnapshot(relativeUrl, externalUrl, queryUrl)
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(mappedSnapshot).toEqual(
        `{"type":2,"tagName":"img","attributes":{"src":"${queryUrlTransformed}"},"childNodes":[],"id":61}`
      );
    });

    it('does not change img srcsets when no mapped asset found in source map', async () => {
      const origSnapshot = createImgSrcsetSnapshot(relativeUrl, externalUrl, queryUrl);
      const domSnapshot = new DOMSnapshot(origSnapshot);

      const mappedSnapshot = await domSnapshot.mapAssetPaths(new Map<string, string>());

      expect(mappedSnapshot).toEqual(origSnapshot);
    });

    it('maps picture srcsets, single <source>', async () => {
      const domSnapshot = new DOMSnapshot(
        createPictureSrcsetSnapshot(relativeUrl, externalUrl, queryUrl)
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual({
        type: 2,
        tagName: 'picture',
        attributes: {},
        childNodes: [
          {
            type: 2,
            tagName: 'img',
            attributes: {
              src: queryUrlTransformed,
            },
            childNodes: [],
            id: 61,
          },
        ],
        id: 62,
      });
    });
  });
});
