import type { RenderToCanvas, WebRenderer } from '@storybook/types';
import { rebuild } from 'rrweb-snapshot';
// eslint-disable-next-line no-restricted-imports
import debounce from 'lodash.debounce';

const pageUrl = new URL(window.location.href);
pageUrl.pathname = '';
pageUrl.search = '';
const strippedUrl = pageUrl.toString().replace(/\/$/, '');

export interface RRWebFramework extends WebRenderer {
  component: undefined;
  storyResult: Record<string, never>;
}

const iframeStyle = 'border: 0; min-width: 100vw; min-height: 100vh;';
// Update the style attribute to set the width/height correctly
function updateDimensions(iframe: HTMLIFrameElement) {
  const { scrollWidth, scrollHeight } = iframe.contentDocument.body;
  iframe.setAttribute(
    'style',
    `${iframeStyle}; width: ${scrollWidth}px; height: ${scrollHeight}px;`
  );
  iframe.setAttribute('id', 'chromatic-e2e-inner-iframe');
}

const renderToCanvas: RenderToCanvas<RRWebFramework> = async (context, element) => {
  const { url, id } = context.storyContext.parameters.server;
  const response = await fetch(`${url}/${id}`);
  const snapshot = await response.json();

  // The snapshot is a representation of a complete HTML document. The first child is the
  // doc type declaration and the second is the html element.
  const htmlNode = snapshot.childNodes[1];

  // If you rebuild the full snapshot with rrweb (the document) it will replace the
  // current document and call `document.open()` in the process, which unbinds all event handlers
  // (and breaks Storybook).
  // However, if you just rebuild the html element part, it will recreate but not attempt to
  // insert it in the DOM.
  // @ts-expect-error rebuild is typed incorreclty, cache and mirror are optional
  const html = (await rebuild(htmlNode, { doc: document })) as HTMLElement;

  // Now we insert the rebuilt html element in the DOM
  document.replaceChild(html, document.children[0]);

  // Storybook's WebView will throw an error if it cannot find these two ids in the DOM.
  // We never render docs (so the #storybook-docs doesn't matter), and our`renderToCanvas`
  // function is already ignoring the #storybook-root (`element` above), so it doesn't matter where
  // they are or what they contain.
  // We make them a script in the head to ensure they don't impact layout.
  document.head.innerHTML +=
    '<script id="storybook-root"></script><script id="storybook-docs"></script>';

  context.showMain();
  return () => {}; // We can't really cleanup
};

export default {
  renderToCanvas,
  parameters: {
    server: { url: strippedUrl },
    layout: 'fullscreen',
  },
};
