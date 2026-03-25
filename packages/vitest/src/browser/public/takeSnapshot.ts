import { assert } from 'vitest';
import { commands } from 'vitest/browser';
import { snapshot } from '@chromaui/rrweb-snapshot';
import { serializedNodeWithId } from '@rrweb/types';
import { getCurrentTest } from '../getCurrentTest';
import type {} from '../../node/commands';

interface Options {
  ignoreUnawaited?: boolean;
}

/**
 * Take visual regression snapshot of the current state of the DOM.
 */
async function takeSnapshot(name?: string): Promise<void>;

/** @internal Pass options when used by automatic snapshots */
async function takeSnapshot(name: string | undefined, options: Options): Promise<void>;

async function takeSnapshot(name?: string, options?: Options): Promise<void> {
  const test = getCurrentTest();

  if (!test) {
    throw new TypeError('takeSnapshot() must be called within a test()');
  }

  if (!test.meta.__chromatic_isRegistered) {
    throw new TypeError(
      'takeSnapshot() cannot be called in a test that is not registered for Chromatic plugin.' +
        `\nMake sure ${test.file.projectName || 'root'} project has chromaticPlugin() enabled.`
    );
  }

  test.meta.__chromatic_isTakeSnapshotCalled = true;

  const save = async () => {
    const domSnapshot = await hackyInlineStatefulElements(() =>
      snapshot(document, { recordCanvas: true })
    );
    assert(domSnapshot, 'Failed to capture DOM snapshot');

    await replaceBlobUrls(domSnapshot);
    await commands.__chromatic_uploadDOMSnapshot(test.id, domSnapshot, name);
  };

  // Ignore is set when called by automatic snapshots
  if (options?.ignoreUnawaited) {
    return await save();
  }

  /**
   * Provide descriptive error if the user forgets to await the takeSnapshot() call.
   * See {@link file://./takeSnapshot.test.ts} for examples.
   */
  const error = new Error('takeSnapshot() call was not awaited!');
  Error.captureStackTrace?.(error, takeSnapshot);

  const pendingCall = { promise: save(), error };
  test.meta.__chromatic_pendingTakeSnapshots ||= [];
  test.meta.__chromatic_pendingTakeSnapshots.push(pendingCall);

  await pendingCall.promise.finally(() => {
    const index = test.meta.__chromatic_pendingTakeSnapshots?.indexOf(pendingCall);

    if (index !== undefined && index !== -1) {
      test.meta.__chromatic_pendingTakeSnapshots?.splice(index, 1);
    }
  });
}

async function replaceBlobUrls(node: serializedNodeWithId) {
  if (!('childNodes' in node)) {
    return;
  }

  await Promise.all(
    node.childNodes.map(async (childNode) => {
      if (
        'tagName' in childNode &&
        childNode.tagName === 'img' &&
        typeof childNode.attributes.src === 'string' &&
        childNode.attributes.src?.startsWith('blob:')
      ) {
        const base64Url = await toDataURL(childNode.attributes.src);
        childNode.attributes.src = base64Url;
      }

      if ('childNodes' in childNode && childNode.childNodes?.length) {
        await replaceBlobUrls(childNode);
      }
    })
  );
}

async function toDataURL(url: string): Promise<string> {
  const blob = await fetch(url).then((res) => res.blob());

  return new Promise<string>((resolveFileRead, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolveFileRead(reader.result?.toString() || '');
    reader.onerror = reject;

    // convert the blob to base64 string
    reader.readAsDataURL(blob);
  });
}

/**
 * This should either be in rrweb/snapshot or Capture should support triggering element pseudo states
 */
// v8 ignore next
async function hackyInlineStatefulElements<T>(method: () => T | Promise<T>): Promise<T> {
  // getComputedStyle() may give different results if animations are not finished
  await Promise.race([
    Promise.allSettled(document.getAnimations().map((animation) => animation.finished)),
    new Promise((resolve) => setTimeout(resolve, 1_000)),
  ]);

  const cleanups: (() => void)[] = [];

  const customProps = new Set<string>();
  const pseudoRe = /:hover|:focus|:focus-visible|:focus-within|:active|:checked/;
  const propRe = /(--[\w-]+)\s*:/g;

  for (const style of Array.from(document.querySelectorAll('style'))) {
    const text = style.textContent || '';
    const ruleMatches = text.matchAll(/([^{}]+)\{([^{}]+)\}/g);

    for (const [, selector, body] of ruleMatches) {
      if (pseudoRe.test(selector)) {
        for (const match of body.matchAll(propRe)) {
          customProps.add(match[1]);
        }
      }
    }
  }

  const statefulElements = Array.from(
    document.querySelectorAll(
      ':hover, :focus, :focus-visible, :focus-within, :active, :checked' as 'div'
    )
  ).reverse();

  for (const element of statefulElements) {
    const style = getComputedStyle(element);

    const values = [];

    for (let i = 0; i < style.length; i++) {
      const prop = style.item(i);
      const value = style.getPropertyValue(prop);
      if (value !== '') {
        values.push({ prop, value });
      }
    }

    for (const prop of customProps) {
      const value = style.getPropertyValue(prop);

      if (value !== '') {
        values.push({ prop, value });
      }
    }

    const originalStyle = element.getAttribute('style') || '';
    cleanups.push(() => element.setAttribute('style', originalStyle));
    cleanups.push(() => element.removeAttribute('data-chromatic-modified'));

    if (values.length !== 0) {
      // So that we can see in snapshots that this hack actually ran, just debugging
      element.setAttribute('data-chromatic-modified', 'true');
    }

    for (const { prop, value } of values) {
      // This is bad, we don't want to modify user's DOM during test run. This should be in rr-web snapshot serialization instead.
      element.style.setProperty(prop, value);
    }
  }

  const output = await method();
  cleanups.splice(0).forEach((fn) => fn());

  return output;
}

export { takeSnapshot };
