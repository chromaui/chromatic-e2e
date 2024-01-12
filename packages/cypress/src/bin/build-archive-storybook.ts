#!/usr/bin/env node

import { buildArchiveStorybook } from '@chromaui/shared-e2e/archive-storybook';
import path from 'path';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = path.resolve(__dirname, '../storybook-config');

buildArchiveStorybook(args, configDir);
