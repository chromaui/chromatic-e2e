#!/usr/bin/env node

import { buildArchiveStorybook } from '@chromatic-com/shared-e2e/archive-storybook';
import path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../constants';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = path.resolve(__dirname, '../storybook-config');

try {
  buildArchiveStorybook(args, configDir, DEFAULT_OUTPUT_DIR);
} catch (err) {
  // Throwing the error results in a large output of minified code and a stacktrace that is
  // likely not helpful to users, so this should hide the noise.
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exitCode = 1;
}
