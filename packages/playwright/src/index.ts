import { test as base, expect } from '@playwright/test';

import { makeTest } from './makeTest';

export const test = makeTest(base);
export { expect };

export { takeArchive } from './takeArchive';
export type { ChromaticConfig } from '@chromaui/shared-e2e';
