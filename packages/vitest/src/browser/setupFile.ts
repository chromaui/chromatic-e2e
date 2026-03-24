import { beforeEach } from 'vitest';
import { commands } from 'vitest/browser';
import { takeSnapshot } from './public/takeSnapshot';
import { type InternalTestContext } from '../types';
import type {} from '../node/commands';

// Destructuring the context is important, so that possible user-provided fixtures work too
beforeEach<InternalTestContext>(async ({ task }) => {
  task.meta.__chromatic_isRegistered = true;

  await commands.__chromatic_interceptFetch(task.id);

  return async function afterEach() {
    // TODO: Replace with waitForIdleNetwork API in Milestone #4
    await new Promise((resolve) => setTimeout(resolve, 500));

    await takeSnapshot();

    await commands.__chromatic_writeTestResult(task.id);

    return cleanup();
  };

  /**
   * Clean internal task meta so that it doesn't show up on Vitest's reporters
   */
  function cleanup() {
    task.meta.__chromatic_isRegistered = undefined;
  }
});
