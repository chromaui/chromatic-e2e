/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
import type { serializedNodeWithId } from 'rrweb-snapshot';
import { NodeType } from 'rrweb-snapshot';

// Matches `url(...)` function in CSS text, excluding data URLs
const CSS_URL_REGEX = /url\((?!['"]?(?:data):)['"]?([^'")]*)['"]?\)/gi;

/**
 * Wraps a snapshot from rrweb and handles post-processing to remap asset paths.
 */
export class DOMSnapshot {
  snapshot: serializedNodeWithId;

  constructor(snapshot: Buffer | string) {
    if (Buffer.isBuffer(snapshot)) {
      const bufferAsString = snapshot.toString('utf-8');
      this.snapshot = JSON.parse(bufferAsString);
    } else {
      this.snapshot = JSON.parse(snapshot);
    }
  }

  async mapAssetPaths(sourceMap: Map<string, string>) {
    const transformedSnapshot = await this.mapNode(this.snapshot, sourceMap);
    return JSON.stringify(transformedSnapshot);
  }

  private async mapNode(node: serializedNodeWithId, sourceMap: Map<string, string>) {
    node = this.mapNodeAttributes(node, sourceMap);
    node = this.mapTextElement(node, sourceMap);

    if ('childNodes' in node) {
      node.childNodes = await Promise.all(
        node.childNodes.map(async (childNode) => {
          return this.mapNode(childNode, sourceMap);
        })
      );
    }

    return node;
  }

  private mapNodeAttributes(node: serializedNodeWithId, sourceMap: Map<string, string>) {
    if (node.type === NodeType.Element) {
      if (node.attributes.src) {
        const sourceVal = node.attributes.src as string;
        if (sourceMap.has(sourceVal)) {
          node.attributes.src = sourceMap.get(sourceVal);
        }
      }

      if (node.attributes.style) {
        const cssText = node.attributes.style as string;
        const mappedCssText = this.mapCssUrls(cssText, sourceMap);
        node.attributes.style = mappedCssText;
      }

      // This is how rrweb stores the contents of an external stylesheet
      // that it will put into a `style` tag on render
      if (node.attributes._cssText) {
        const cssText = node.attributes._cssText as string;
        const mappedCssText = this.mapCssUrls(cssText, sourceMap);
        node.attributes._cssText = mappedCssText;
      }
    }

    return node;
  }

  private mapTextElement(node: serializedNodeWithId, sourceMap: Map<string, string>) {
    if (node.type === NodeType.Text && node.isStyle) {
      if (node.textContent) {
        const mappedCssText = this.mapCssUrls(node.textContent, sourceMap);
        node.textContent = mappedCssText;
      }
    }

    return node;
  }

  private mapCssUrls(cssText: string, sourceMap: Map<string, string>) {
    return cssText.replace(CSS_URL_REGEX, (match, fullUrl) => {
      let cssUrl = match;
      if (sourceMap.has(fullUrl)) {
        cssUrl = match.replace(fullUrl, sourceMap.get(fullUrl));
      }
      return cssUrl;
    });
  }
}
/* eslint-enable no-underscore-dangle */
/* eslint-enable no-param-reassign */
