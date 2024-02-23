#!/usr/bin/env node

import { buildArchiveStorybook } from '@chromatic-com/shared-e2e/archive-storybook';
import path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../constants';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = path.resolve(__dirname, '../storybook-config');

buildArchiveStorybook(args, configDir, DEFAULT_OUTPUT_DIR);
