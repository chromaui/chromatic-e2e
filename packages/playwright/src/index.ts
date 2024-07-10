import { test as base, expect } from '@playwright/test';

import { makeTest } from './makeTest';

export const test = makeTest(base);
export { expect };

export { takeSnapshot } from './takeSnapshot';
export { createResourceArchive } from './createResourceArchive';
export type { ChromaticConfig } from '@chromatic-com/shared-e2e';
