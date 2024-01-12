import type { RenderToCanvas, WebRenderer } from '@storybook/types';
import { rebuild } from 'rrweb-snapshot';
// eslint-disable-next-line no-restricted-imports
import debounce from 'lodash.debounce';

const pageUrl = new URL(window.location.href);
pageUrl.pathname = '';
pageUrl.search = '';
const strippedUrl = pageUrl.toString().replace(/\/$/, '');

export const parameters = { server: { url: strippedUrl } };

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

  const iframe = document.createElement('iframe');
  iframe.setAttribute('style', iframeStyle);
  element.appendChild(iframe);

  // @ts-expect-error rebuild is typed incorreclty, cache and mirror are optional
  await rebuild(snapshot, { doc: iframe.contentDocument });

  // Wait a moment, then set the dimensions of the iframe
  setTimeout(() => updateDimensions(iframe), 100);

  // Also update the dimension every time the window changes size
  window.addEventListener(
    'resize',
    debounce(() => updateDimensions(iframe), 100)
  );

  context.showMain();
  return () => {
    element.removeChild(iframe);
  };
};

export { renderToCanvas };
