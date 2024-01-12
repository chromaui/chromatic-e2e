#!/usr/bin/env node

import { archiveStorybook } from '@chromaui/shared-e2e/archive-storybook/scripts';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = 'node_modules/chromatic-playwright/dist/.storybook';

archiveStorybook(args, configDir);
