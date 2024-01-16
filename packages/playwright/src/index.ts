import { test as base, expect } from '@playwright/test';

import { makeTest } from './makeTest';

export const test = makeTest(base);
export { expect };

export { takeSnapshot } from './takeSnapshot';
export type { ChromaticConfig } from '@chromaui/shared-e2e';
