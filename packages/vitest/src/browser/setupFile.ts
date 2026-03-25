import { beforeEach } from 'vitest';
import { commands } from 'vitest/browser';
import { takeSnapshot } from './public/takeSnapshot';
import { waitForIdleNetwork } from './public/waitForIdleNetwork';
import { type InternalTestContext } from '../types';
import type {} from '../node/commands';

// Destructuring the context is important, so that possible user-provided fixtures work too
beforeEach<InternalTestContext>(async ({ task }) => {
  const options = await commands.__chromatic_getOptions();

  task.meta.__chromatic_isRegistered = true;
  task.meta.__chromatic_isTakeSnapshotCalled = false;

  await commands.__chromatic_interceptFetch(task.id);

  return async function afterEach() {
    const { __chromatic_pendingTakeSnapshots: pendingTakeSnapshots } = task.meta;

    if (pendingTakeSnapshots?.length) {
      throw new AggregateError(
        pendingTakeSnapshots.map((call) => call.error),
        `${pendingTakeSnapshots.length} unawaited takeSnapshot() call(s)`
      );
    }

    if (options.resourceArchiveTimeout !== 0) {
      await waitForIdleNetwork(options.resourceArchiveTimeout);
    }

    await takeSnapshot(undefined, { ignoreUnawaited: true });

    await commands.__chromatic_writeTestResult(task.id);

    return cleanup();
  };

  /**
   * Clean internal task meta so that it doesn't show up on Vitest's reporters
   */
  function cleanup() {
    task.meta.__chromatic_isTakeSnapshotCalled = undefined;
    task.meta.__chromatic_isRegistered = undefined;
    task.meta.__chromatic_pendingTakeSnapshots = undefined;
  }
});
