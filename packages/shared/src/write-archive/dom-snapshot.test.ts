import { DOMSnapshot } from './dom-snapshot';

const relativeUrl = '/images/image.png';
const externalUrl = 'https://chromatic.com/img';
const queryUrl = '/images/img?src=https://chromatic.com/img';
const queryUrlTransformed = '/images/somehash.png';

function createSnapshot(url1: string, url2: string, url3: string) {
  return `{"type":0,"childNodes":[{"type":1,"name":"html","publicId":"","systemId":"","id":2},{"type":2,"tagName":"html","attributes":{},"childNodes":[{"type":2,"tagName":"head","attributes":{},"childNodes":[{"type":3,"textContent":"    ","id":5},{"type":2,"tagName":"link","attributes":{"rel":"stylesheet","href":"/styles-test.css"},"childNodes":[],"id":6},{"type":3,"textContent":"    ","id":7},{"type":2,"tagName":"style","attributes":{},"childNodes":[{"type":3,"textContent":".test1 { background-image: url(\\"${url1}\\"); }.test2 { background-image: url(\\"${url2}\\"); }.test2 { background-image: url(\\"${url3}\\"); }","isStyle":true,"id":9}],"id":8},{"type":3,"textContent":"  ","id":10}],"id":4},{"type":3,"textContent":"  ","id":11},{"type":2,"tagName":"body","attributes":{},"childNodes":[{"type":3,"textContent":"    ","id":13},{"type":2,"tagName":"div","attributes":{"class":"image-container flex flex-wrap"},"childNodes":[{"type":3,"textContent":"      ","id":15},{"type":2,"tagName":"img","attributes":{"src":"${url1}"},"childNodes":[],"id":16},{"type":3,"textContent":"      ","id":17},{"type":2,"tagName":"img","attributes":{"src":"${url2}"},"childNodes":[],"id":18},{"type":3,"textContent":"      ","id":19},{"type":2,"tagName":"img","attributes":{"src":"${url3}"},"childNodes":[],"id":20},{"type":3,"textContent":"      ","id":21},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url1}'); no-repeat center;"},"childNodes":[],"id":22},{"type":3,"textContent":"      ","id":23},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url2}'); no-repeat center;"},"childNodes":[],"id":24},{"type":3,"textContent":"      ","id":25},{"type":2,"tagName":"div","attributes":{"style":"background: url('${url3}'); no-repeat center;"},"childNodes":[],"id":26},{"type":3,"textContent":"    ","id":27}],"id":14},{"type":3,"textContent":"  ","id":28}],"id":12}],"id":3}],"id":1}`;
}

function createImgSrcsetSnapshot({
  backupUrl,
  smallUrl,
  largeUrl,
}: {
  backupUrl: string;
  smallUrl: string;
  largeUrl: string;
}) {
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

function createPictureSrcsetSnapshotSingleSource({
  backupUrl,
  matchingUrl,
}: {
  backupUrl: string;
  matchingUrl: string;
}) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: matchingUrl,
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

function createPictureSrcsetSnapshotSingleSourceImageHasAttributes({
  backupUrl,
  matchingUrl,
}: {
  backupUrl: string;
  matchingUrl: string;
}) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: matchingUrl,
        },
        childNodes: [],
        id: 63,
      },
      {
        type: 2,
        tagName: 'img',
        attributes: {
          class: 'do-not-remove-me',
          src: backupUrl,
        },
        childNodes: [],
        id: 61,
      },
    ],
    id: 62,
  });
}

function createPictureSrcsetSnapshotSingleSourceMultipleSrcsets({
  backupUrl,
  wrongUrl,
  matchingUrl,
}: {
  backupUrl: string;
  wrongUrl: string;
  matchingUrl: string;
}) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          expectedMappedSnapshot,
          srcset: `${wrongUrl} 2000w, ${matchingUrl} 900w`,
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

function createPictureSrcsetSnapshotMultipleSources({
  backupUrl,
  wrongUrl,
  matchingUrl,
}: {
  backupUrl: string;
  wrongUrl: string;
  matchingUrl: string;
}) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: wrongUrl,
        },
        childNodes: [],
        id: 64,
      },
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: matchingUrl,
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

function createPictureSrcsetNoUrlMatches({
  wrongUrl,
  alsoWrongUrl,
}: {
  wrongUrl: string;
  alsoWrongUrl: string;
}) {
  return JSON.stringify({
    type: 2,
    tagName: 'picture',
    attributes: {},
    childNodes: [
      {
        type: 2,
        tagName: 'source',
        attributes: {
          srcset: wrongUrl,
        },
        childNodes: [],
        id: 63,
      },
      {
        type: 2,
        tagName: 'img',
        attributes: {
          src: alsoWrongUrl,
        },
        childNodes: [],
        id: 61,
      },
    ],
    id: 62,
  });
}

const imageTag = {
  type: 2,
  tagName: 'img',
  attributes: {
    src: queryUrlTransformed,
  },
  // @ts-expect-error I don't want to deal with this right now
  childNodes: [],
  id: 61,
};

const pictureWithJustImageTag = {
  type: 2,
  tagName: 'picture',
  attributes: {},
  childNodes: [imageTag],
  id: 62,
};

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
        createImgSrcsetSnapshot({
          backupUrl: relativeUrl,
          smallUrl: externalUrl,
          largeUrl: queryUrl,
        })
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual({
        type: 2,
        tagName: 'img',
        attributes: {
          src: `${queryUrlTransformed}`,
        },
        childNodes: [],
        id: 61,
      });
    });

    it('does not change img srcsets when no mapped asset found in source map', async () => {
      const originalSnapshot = createImgSrcsetSnapshot({
        backupUrl: relativeUrl,
        smallUrl: externalUrl,
        largeUrl: queryUrl,
      });
      const domSnapshot = new DOMSnapshot(originalSnapshot);

      const mappedSnapshot = await domSnapshot.mapAssetPaths(new Map<string, string>());

      expect(mappedSnapshot).toEqual(originalSnapshot);
    });

    it('maps picture srcsets, single <source>', async () => {
      const domSnapshot = new DOMSnapshot(
        createPictureSrcsetSnapshotSingleSource({ backupUrl: relativeUrl, matchingUrl: queryUrl })
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual(pictureWithJustImageTag);
    });

    it('maps picture srcsets, multiple <source>s', async () => {
      const domSnapshot = new DOMSnapshot(
        createPictureSrcsetSnapshotMultipleSources({
          backupUrl: relativeUrl,
          wrongUrl: externalUrl,
          matchingUrl: queryUrl,
        })
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual(pictureWithJustImageTag);
    });

    it('maps picture srcsets, single <source> with multiple srcset values', async () => {
      const domSnapshot = new DOMSnapshot(
        createPictureSrcsetSnapshotSingleSourceMultipleSrcsets({
          backupUrl: relativeUrl,
          wrongUrl: externalUrl,
          matchingUrl: queryUrl,
        })
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual(pictureWithJustImageTag);
    });

    it('maps picture srcsets, <picture> and children left untouched if there is no URL match', async () => {
      const originalSnapshot = createPictureSrcsetNoUrlMatches({
        wrongUrl: '/totally-bogus-url.png',
        alsoWrongUrl: 'https://another-totally-bogus.com/url.png',
      });
      const domSnapshot = new DOMSnapshot(originalSnapshot);

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual(JSON.parse(originalSnapshot));
    });

    // important that we only blow away what we need to; since <picture> contents are styled by their <img> tag,
    // we don't want to get rid of any existing <img> attributes (like class for example)
    it('maps picture srcsets, preserves existing <img> attributes', async () => {
      const domSnapshot = new DOMSnapshot(
        createPictureSrcsetSnapshotSingleSourceImageHasAttributes({
          backupUrl: relativeUrl,
          matchingUrl: queryUrl,
        })
      );

      const mappedSnapshot = await domSnapshot.mapAssetPaths(sourceMap);

      expect(JSON.parse(mappedSnapshot)).toEqual({
        ...pictureWithJustImageTag,
        childNodes: [
          {
            ...imageTag,
            attributes: {
              ...imageTag.attributes,
              class: 'do-not-remove-me',
            },
          },
        ],
      });
    });
  });
});
