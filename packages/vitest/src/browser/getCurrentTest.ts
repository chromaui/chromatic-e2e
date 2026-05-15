import { TestRunner } from 'vitest';
import { InternalTestContext } from '../types';

export type Test = ReturnType<typeof TestRunner.getCurrentTest> & InternalTestContext['task'];

export function getCurrentTest() {
  return TestRunner.getCurrentTest<Test | undefined>();
}
