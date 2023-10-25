import { test as base, expect } from '@playwright/test';

import { makeTest } from './playwright-api/makeTest';

export const test = makeTest(base);

export { expect };

export { archiveCypress, setupNetworkListener, completeArchive } from './cypress-api';
export { addCommands } from './cypress-api/commands';

export { takeArchive } from './playwright-api/takeArchive';
export type { ChromaticConfig } from './types';
