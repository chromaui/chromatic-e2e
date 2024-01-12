#!/usr/bin/env node

import { buildArchiveStorybook } from '@chromaui/shared-e2e/archive-storybook/scripts';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = 'node_modules/chromatic-cypress/dist/.storybook';

buildArchiveStorybook(args, configDir);
