import type { RenderContext, RenderToCanvas, WebRenderer } from 'storybook/internal/types';
import type { serializedNodeWithId } from '@rrweb/types';
import { NodeType } from '@rrweb/types';
import { rebuild, createMirror, createCache } from '@chromaui/rrweb-snapshot';
import { type SavedSnapshot } from '@chromatic-com/shared-e2e';
import {
  isElement,
  isIframeElement,
  isIframeSerializedNode,
} from '@chromatic-com/shared-e2e/utils/nodes';

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

const findNodeById = (node: serializedNodeWithId, id: number): serializedNodeWithId | undefined => {
  if (node.id === id) {
    return node;
  }

  if ('childNodes' in node) {
    for (const childNode of node.childNodes) {
      const match = findNodeById(childNode, id);

      if (match) {
        return match;
      }
    }
  }

  return undefined;
};

// NOTE: This is duplicated in the shared package due to bundling issues
function snapshotFileName(snapshotId: string, viewport: string) {
  const fileNameParts = [snapshotId, viewport, 'snapshot.json'];
  return fileNameParts.join('.');
}

async function fetchSnapshot(context: RenderContext<RRWebFramework>): Promise<SavedSnapshot> {
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
  const { snapshot, pseudoClassIds } = await fetchSnapshot(context);

  // The snapshot is a representation of a complete HTML document
  const htmlNode = findHtmlNode(snapshot);

  // If you rebuild the full snapshot with rrweb (the document) it will replace the
  // current document and call `document.open()` in the process, which unbinds all event handlers
  // (and breaks Storybook).
  // However, if you just rebuild the html element part, it will recreate but not attempt to
  // insert it in the DOM.
  const mirror = createMirror();
  const html = rebuild(htmlNode!, {
    doc: document,
    mirror,
    cache: createCache(),
    afterAppend: afterAppendIframes(snapshot),
  }) as HTMLElement;

  for (const [className, ids] of Object.entries(pseudoClassIds)) {
    for (const id of ids) {
      const el = mirror.getNode(id);

      if (isElement(el)) {
        el.classList.add(className);
      }
    }
  }

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

function afterAppendIframes(snapshot: serializedNodeWithId) {
  return function afterAppend(node: Node, id: number) {
    if (!isIframeElement(node)) {
      return;
    }

    const serializedNode = findNodeById(snapshot, id);

    if (!isIframeSerializedNode(serializedNode)) {
      return;
    }

    node.onload = () => {
      const mirror = createMirror();

      rebuild(serializedNode.contentDocument, {
        doc: node.contentDocument,
        mirror,
        cache: createCache(),

        // Recursively build iframes within iframes
        afterAppend: afterAppendIframes(serializedNode.contentDocument),
      });

      for (const [className, ids] of Object.entries(serializedNode.pseudoClassIds)) {
        for (const id of ids) {
          const el = mirror.getNode(id);

          if (isElement(el)) {
            el.classList.add(className);
          }
        }
      }
    };
  };
}

export default {
  renderToCanvas,
  parameters: {
    server: { url: strippedUrl },
    layout: 'fullscreen',
  },
};
