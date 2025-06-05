/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
import type { serializedElementNodeWithId, serializedNodeWithId } from '@rrweb/types';
import { NodeType } from '@rrweb/types';
import srcset from 'srcset';

// Matches `url(...)` function in CSS text, excluding data URLs
const CSS_URL_REGEX = /url\((?!['"]?(?:data):)['"]?([^'")]*)['"]?\)/gi;

function normalizePath(path: string): string {
  // Convert Windows backslashes to forward slashes
  return path.replace(/\\/g, '/');
}

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
        const normalizedSourceVal = normalizePath(sourceVal);
        if (sourceMap.has(normalizedSourceVal)) {
          node.attributes.src = sourceMap.get(normalizedSourceVal);
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

      if (['link', 'use'].includes(node.tagName) && node.attributes.href) {
        const hrefVal = node.attributes.href as string;
        const hrefValAndAnchor = hrefVal.split('#');
        const hrefValWithoutAnchor = normalizePath(hrefValAndAnchor[0]);
        if (sourceMap.has(hrefValWithoutAnchor)) {
          hrefValAndAnchor[0] = sourceMap.get(hrefValWithoutAnchor);
          node.attributes.href = hrefValAndAnchor.join('#');
        }
      }

      // When an image tag has the `srcset` attributes, the browser will choose one of the images
      // from the `srcset` list to load at render time based on the viewport size. To support this,
      // we parse the URLs in the `srcset` attribute and try to find a match in the asset map.
      // If a match is found, we'll overwrite the `src` attribute with the mapped asset path,
      // and we'll remove the `srcset` and `sizes` attributes because we'll only have captured
      // the one asset that the browser decided to load when this was rendered. We don't want
      // the browser to try to load one of the others when this snapshot is rendered in Chromatic
      // because we won't have archived them.
      if (node.tagName === 'img' && node.attributes.srcset) {
        const srcsetValue = node.attributes.srcset as string;
        const currentSrc = this.mapSrcsetUrls(srcsetValue, sourceMap);
        if (currentSrc) {
          node.attributes.src = currentSrc;

          // Remove srcset attributes since we'll only have the one that
          // loaded on render archived
          delete node.attributes.srcset;
          delete node.attributes.sizes;
        }
      }

      if (node.tagName === 'picture') {
        this.mapPictureElement(node, sourceMap);
      }
    }

    return node;
  }

  private mapPictureElement(node: serializedElementNodeWithId, sourceMap: Map<string, string>) {
    const allSourceUrls: string[] = node.childNodes
      .filter(this.isSourceElement)
      .map((childNode: serializedElementNodeWithId) => {
        // there can be multiple values in a single srcset, extract all of them
        const sourceSetValues = srcset.parse(
          (childNode.attributes?.srcset as string | undefined) ?? ''
        );
        return sourceSetValues.map((srcSetValue) => srcSetValue.url);
      })
      // since srcsets can have multiple values, we will have a nested array here
      .flat();

    // we have all of the raw URLs.
    const matchingUrl = allSourceUrls.find((sourceUrl) => {
      // find a url in the asset map... by which we mean in the sourceMap
      return sourceMap.has(sourceUrl);
    });

    // do any of my children match what is in there?
    if (matchingUrl) {
      // if so, blow away all <source> tags
      node.childNodes = node.childNodes.filter((childNode) => !this.isSourceElement(childNode));

      // replace the <img> tag's `src` with this asset-mapped URL
      const imageElement = node.childNodes.find(
        (childNode) => childNode.type === NodeType.Element && childNode.tagName === 'img'
      ) as serializedElementNodeWithId;
      if (imageElement && imageElement.attributes) {
        // we're assuming that whatever was archived is an image URL
        // this should be the case (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source#srcset),
        // but noting it here as it'a an assumption
        imageElement.attributes.src = sourceMap.get(matchingUrl);
      }
    }
  }

  private isSourceElement(childNode: serializedNodeWithId) {
    return childNode.type === NodeType.Element && childNode.tagName === 'source';
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
      const normalizedUrl = normalizePath(fullUrl);
      if (sourceMap.has(normalizedUrl)) {
        cssUrl = match.replace(fullUrl, sourceMap.get(normalizedUrl));
      }
      return cssUrl;
    });
  }

  private mapSrcsetUrls(srcsetValue: string, sourceMap: Map<string, string>) {
    const parsedSrcset = srcset.parse(srcsetValue);
    let currentSrc;
    parsedSrcset.forEach((set) => {
      const normalizedUrl = normalizePath(set.url);
      if (sourceMap.has(normalizedUrl)) {
        currentSrc = sourceMap.get(normalizedUrl);
      }
    });
    return currentSrc;
  }
}
/* eslint-enable no-underscore-dangle */
/* eslint-enable no-param-reassign */
