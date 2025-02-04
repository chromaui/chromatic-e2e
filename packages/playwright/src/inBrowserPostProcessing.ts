import RRWebSnapshot, {
  serializedElementNodeWithId,
  serializedNodeWithId,
} from '@chromaui/rrweb-snapshot';

export const postProcessSnapshot = (): Promise<serializedNodeWithId> => {
  // page.evaluate returns the value of the function being evaluated. In this case, it means that
  // it is returning either the resolved value of the Promise or the return value of the call to
  // the snapshot function. See https://playwright.dev/docs/api/class-page#page-evaluate.
  // @ts-expect-error define is a global in the browser
  if (typeof define === 'function' && define.amd) {
    // AMD support is detected, so we need to load rrwebSnapshot asynchronously
    return new Promise((resolve) => {
      // @ts-expect-error "require" in this context is in browser (AMD require), not Node.js require
      require(['rrwebSnapshot'], (rrwebSnapshot) => {
        resolve(rrwebSnapshot.snapshot(document));
      });
    });
  } else {
    return new Promise((resolve) => {
      // @ts-expect-error -- rrwebSnapshot is available as a global in the browser
      const domSnapshot = (rrwebSnapshot as typeof RRWebSnapshot).snapshot(
        document
      ) as serializedElementNodeWithId;
      // do some post-processing on the snapshot
      const toDataURL = async (url: string): Promise<string> => {
        // read contents of the blob URL
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '');
          reader.onerror = reject;
          // convert the blob to base64 string
          reader.readAsDataURL(blob);
        });
      };

      const gatherBlobUrls = async (node: serializedElementNodeWithId) => {
        await Promise.all(
          node.childNodes.map(async (childNode) => {
            // only process actual element nodes
            if (childNode.type !== 2) {
              return;
            }
            if (
              childNode.tagName === 'img' &&
              typeof childNode.attributes.src === 'string' &&
              childNode.attributes.src?.startsWith('blob:')
            ) {
              const base64Url = await toDataURL(childNode.attributes.src);
              childNode.attributes.src = base64Url;
            }

            if (childNode.childNodes?.length) {
              await gatherBlobUrls(childNode);
            }
          })
        );
      };

      gatherBlobUrls(domSnapshot).then(() => {
        resolve(domSnapshot);
      });
    });
  }
};
