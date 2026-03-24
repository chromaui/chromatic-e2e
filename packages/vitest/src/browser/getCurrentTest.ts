import * as vitest from 'vitest';
import { InternalTestContext } from '../types';

export type Test = ReturnType<typeof vitest.TestRunner.getCurrentTest> &
  InternalTestContext['task'];

const hooks = vitest.TestRunner
  ? // vitest@^4.1.0 API
    vitest.TestRunner
  : // Logs warning on vitest@^4.1.0
    await import('vitest/suite');

export function getCurrentTest() {
  return hooks.getCurrentTest<Test | undefined>();
}
