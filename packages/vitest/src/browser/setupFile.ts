import { afterEach, beforeEach } from 'vitest';
import { commands } from 'vitest/browser';
import { takeSnapshot } from './public/takeSnapshot';
import { waitForIdleNetwork } from './public/waitForIdleNetwork';
import { type InternalTestContext } from '../types';
import type {} from '../node/commands';

// Destructuring the context is important, so that possible user-provided fixtures work too
beforeEach<InternalTestContext>(async ({ task }) => {
  const options = await commands.__chromatic_getOptions();

  if (options.tags) {
    // If user has defined plugin tags we register only the tests that match those tags
    const hasMatchingTag = task.tags?.some((tag) => options.tags?.includes(tag));

    if (!hasMatchingTag) {
      task.meta.__chromatic_isRegistered = false;
      return cleanup;
    }
  }

  task.meta.__chromatic_isRegistered = true;
  task.meta.__chromatic_isTakeSnapshotCalled = false;

  // This may have been initialized by module or suite level disableAutoSnapshot() call already
  task.meta.__chromatic_autoSnapshot ??= !options.disableAutoSnapshot;

  await commands.__chromatic_interceptFetch(task.id);

  // This runs after any user-defined afterEach hooks
  return async function beforeEachCleanup() {
    // These can be overriden during test run too
    const {
      __chromatic_isTakeSnapshotCalled: isTakeSnapshotCalled,
      __chromatic_pendingTakeSnapshots: pendingTakeSnapshots,
      __chromatic_isRegistered: isRegistered,
    } = task.meta;

    if (!isRegistered) {
      return cleanup();
    }

    if (pendingTakeSnapshots?.length) {
      throw new PendingSnapshotsError(pendingTakeSnapshots);
    }

    // Bail out early if it's detected that no snapshots were taken
    if (!isTakeSnapshotCalled) {
      await commands.__chromatic_stopWithoutSnapshots(task.id);

      return cleanup();
    }

    await commands.__chromatic_writeTestResult(task.id);

    return cleanup();
  };

  /**
   * Clean internal task meta so that it doesn't show up on Vitest's reporters
   */
  function cleanup() {
    task.meta.__chromatic_autoSnapshot = undefined;
    task.meta.__chromatic_isTakeSnapshotCalled = undefined;
    task.meta.__chromatic_isRegistered = undefined;
    task.meta.__chromatic_pendingTakeSnapshots = undefined;
  }
});

// This runs before any user-defined afterEach hooks
afterEach<InternalTestContext>(async ({ task }) => {
  // These can be overriden during test run too
  const {
    __chromatic_autoSnapshot: autoSnapshot,
    __chromatic_pendingTakeSnapshots: pendingTakeSnapshots,
    __chromatic_isRegistered: isRegistered,
  } = task.meta;

  if (!isRegistered) {
    return;
  }

  if (pendingTakeSnapshots?.length) {
    throw new PendingSnapshotsError(pendingTakeSnapshots);
  }

  if (!autoSnapshot) {
    return;
  }

  const options = await commands.__chromatic_getOptions();

  if (options.resourceArchiveTimeout !== 0) {
    await waitForIdleNetwork(options.resourceArchiveTimeout);
  }

  // Take automatic snapshot
  await takeSnapshot(undefined, { isAutoSnapshot: true });
});

class PendingSnapshotsError extends AggregateError {
  constructor(public pendingCalls: Array<{ error: Error }>) {
    super(
      pendingCalls.map((call) => call.error),
      `${pendingCalls.length} unawaited takeSnapshot() call(s)`
    );
    this.name = 'PendingSnapshotsError';
  }
}
