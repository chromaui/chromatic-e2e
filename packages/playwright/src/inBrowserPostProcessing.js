// THIS FILE IS RUN IN THE BROWSER (via Playwright page.evaluate()).

export const postProcessSnapshot = () => {
  const doAllThisStuff = (importedRRWebSnapshot, resolve) => {
    const domSnapshot = importedRRWebSnapshot.snapshot(document);
    // do some post-processing on the snapshot
    const toDataURL = async (url) => {
      // read contents of the blob URL
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        // convert the blob to base64 string
        reader.readAsDataURL(blob);
      });
    };

    const replaceBlobUrls = async (node) => {
      await Promise.all(
        node.childNodes.map(async (childNode) => {
          if (childNode.tagName === 'img' && childNode.attributes.src?.startsWith('blob:')) {
            const base64Url = await toDataURL(childNode.attributes.src);
            childNode.attributes.src = base64Url;
          }

          if (childNode.childNodes?.length) {
            await replaceBlobUrls(childNode);
          }
        })
      );
    };

    replaceBlobUrls(domSnapshot).then(() => {
      resolve(domSnapshot);
    });
  };

  // page.evaluate returns the value of the function being evaluated. In this case, it means that
  // it is returning either the resolved value of the Promise or the return value of the call to
  // the snapshot function. See https://playwright.dev/docs/api/class-page#page-evaluate.
  if (typeof define === 'function' && define.amd) {
    // AMD support is detected, so we need to load rrwebSnapshot asynchronously
    return new Promise((resolve) => {
      require(['rrwebSnapshot'], (rrwebSnapshot) => {
        doAllThisStuff(rrwebSnapshot, resolve);
      });
    });
  } else {
    return new Promise((resolve) => {
      doAllThisStuff(rrwebSnapshot, resolve);
    });
  }
};
