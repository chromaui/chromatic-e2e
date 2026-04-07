import * as vitest from 'vitest';
import { InternalTestContext } from '../types';

export type Test = ReturnType<typeof vitest.TestRunner.getCurrentTest> &
  InternalTestContext['task'];

const hooks = await resolveHooks();

export function getCurrentTest() {
  return hooks.getCurrentTest<Test | undefined>();
}

async function resolveHooks() {
  // TestRunner API is available on vitest@4.1.0
  if (vitest.TestRunner) {
    return vitest.TestRunner;
  }

  // Fallback to older API. Using this with 4.1.0 logs deprecation warning.
  return await import('vitest/suite');
}
