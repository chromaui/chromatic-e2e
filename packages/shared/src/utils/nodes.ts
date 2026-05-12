import { NodeType, serializedNodeWithId } from '@rrweb/types';
import type { SerializedIframeNode } from '../types';

export function isIframeSerializedNode(node: serializedNodeWithId): node is SerializedIframeNode {
  return (
    node.type === NodeType.Element &&
    node.tagName === 'iframe' &&
    'contentDocument' in node &&
    !!node.contentDocument
  );
}

export function isElement(node: Node | undefined): node is Element {
  return node?.nodeType === Node.ELEMENT_NODE;
}

export function isIframeElement(node: Node): node is HTMLIFrameElement {
  return isElement(node) && node.tagName.toLowerCase() === 'iframe';
}
