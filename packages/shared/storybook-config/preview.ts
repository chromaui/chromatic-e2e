import type { RenderContext, RenderToCanvas, WebRenderer } from 'storybook/internal/types';
import type { serializedNodeWithId } from '@chromaui/rrweb-snapshot';
import { NodeType, rebuild } from '@chromaui/rrweb-snapshot';

const pageUrl = new URL(window.location.href);
pageUrl.pathname = '';
pageUrl.search = '';
const strippedUrl = pageUrl.toString().replace(/\/$/, '');

export interface RRWebFramework extends WebRenderer {
  component: undefined;
  storyResult: Record<string, never>;
}

const findHtmlNode = (node: serializedNodeWithId): serializedNodeWithId | undefined => {
  if (node.type === NodeType.Element && node.tagName === 'html') {
    return node;
  }

  if ('childNodes' in node) {
    return node.childNodes.find((childNode) => {
      return findHtmlNode(childNode);
    });
  }

  return undefined;
};

// NOTE: This is duplicated in the shared package due to bundling issues
function snapshotFileName(snapshotId: string, viewport: string) {
  const fileNameParts = [snapshotId, viewport, 'snapshot.json'];
  return fileNameParts.join('.');
}

async function fetchSnapshot(context: RenderContext<RRWebFramework>) {
  const { url, id } = context.storyContext.parameters.server;
  const { viewport } = context.storyContext.globals;

  // Viewport seems to be a string or an object
  let viewportName;
  if (typeof viewport === 'string') {
    viewportName = viewport;
  } else {
    // NOTE: This is duplicated in the shared package due to bundling issues
    viewportName = `w${viewport.width}h${viewport.height}`;
  }

  let response = await fetch(`${url}/${snapshotFileName(id, viewportName)}`);
  if (!response.ok) {
    // Possibly a viewport was specified that we haven't captured, or it's the addon's
    // default of `reset`, so we'll load the default viewport snapshot instead.
    const { defaultViewport } = context.storyContext.parameters.viewport;
    response = await fetch(`${url}/${snapshotFileName(id, defaultViewport)}`);
  }

  return response.json();
}

const renderToCanvas: RenderToCanvas<RRWebFramework> = async (context) => {
  const snapshot = await fetchSnapshot(context);

  // The snapshot is a representation of a complete HTML document
  const htmlNode = findHtmlNode(snapshot);

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
