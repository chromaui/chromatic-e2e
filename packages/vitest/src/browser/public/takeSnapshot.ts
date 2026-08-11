import { assert } from 'vitest';
import { commands } from 'vitest/browser';
import { snapshot as rrwebSnapshot, createMirror } from '@chromaui/rrweb-snapshot';
import { serializedNodeWithId } from '@rrweb/types';
import { type DOMSnapshots } from '@chromatic-com/shared-e2e';
import { getCurrentTest } from '../getCurrentTest';
import { isChromium } from '../isChromium';
import { trackEvent } from '../telemetry';
import type {} from '../../node/commands';

interface Options {
  isAutomaticSnapshot: boolean;
}

/**
 * Take visual regression snapshot of the current state of the DOM.
 */
async function takeSnapshot(name?: string): Promise<void>;

/** @internal Pass options when used by automatic snapshots */
async function takeSnapshot(name: string | undefined, options: Options): Promise<void>;

async function takeSnapshot(name?: string, options?: Options): Promise<void> {
  if (!isChromium()) {
    return;
  }

  const test = getCurrentTest();

  if (!test) {
    trackEvent({
      eventType: 'take_snapshot_invalid_call',
      level: 'error',
      payload: { isInsideTest: false, isRegisteredTest: undefined, isAwaited: undefined },
    });

    throw new TypeError('takeSnapshot() must be called within a test()');
  }

  if (!test.meta.__chromatic_isRegistered) {
    trackEvent({
      eventType: 'take_snapshot_invalid_call',
      level: 'error',
      payload: { isInsideTest: true, isRegisteredTest: false, isAwaited: undefined },
    });

    throw new TypeError(
      'takeSnapshot() cannot be called in a test that is not registered for Chromatic plugin.' +
        `\nMake sure ${test.file.projectName || 'root'} project has chromaticPlugin() enabled.`
    );
  }

  const mirror = createMirror();
  const domSnapshot = snapshot({ document, mirror, onError: trackSnapshotError('capture') });

  const pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'] = {};

  for (const className of [':hover', ':focus', ':focus-visible', ':active'] as const) {
    const elements = document.querySelectorAll(className);
    const ids = Array.from(elements, (el) => mirror.getId(el)).filter((id) => id !== -1);
    pseudoClassIds[className] = ids;
  }

  const save = async () => {
    await replaceBlobUrls(domSnapshot).catch(trackSnapshotError('replace-blob-urls'));

    await commands
      .__chromatic_uploadDOMSnapshot(
        test.id,
        domSnapshot,
        pseudoClassIds,
        name ?? null, // Convert undefined to null to avoid https://github.com/vitest-dev/vitest/issues/10864
        options
      )
      .catch(trackSnapshotError('upload'));

    test.meta.__chromatic_isTakeSnapshotCalled = true;
  };

  // Automatic snapshots are always awaited
  if (options?.isAutomaticSnapshot) {
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

  /**
   * Report a snapshot failure to telemetry before rethrowing it. The error is serialized
   * eagerly, as `Error` instances would not survive the RPC to the Node process.
   */
  function trackSnapshotError(operation: 'capture' | 'replace-blob-urls' | 'upload') {
    return function onError(error: unknown) {
      trackEvent({
        eventType: 'snapshot_error',
        level: 'error',
        payload: {
          operation,
          isAutomaticSnapshot: options?.isAutomaticSnapshot ?? false,
          error: error instanceof Error ? (error.stack ?? error.message) : String(error),
        },
      });

      throw error;
    };
  }
}

function snapshot(options: {
  document: Document;
  mirror: ReturnType<typeof createMirror>;
  onError: (error: unknown) => void;
}): serializedNodeWithId {
  try {
    const domSnapshot = rrwebSnapshot(options.document, {
      recordCanvas: true,
      mirror: options.mirror,
    });
    assert(domSnapshot, 'Failed to capture DOM snapshot');

    return domSnapshot;
  } catch (error) {
    options.onError(error);
    throw error;
  }
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

export { takeSnapshot };
