#!/usr/bin/env node

import { archiveStorybook } from '@chromatic-com/shared-e2e/archive-storybook';
import path from 'path';
import { DEFAULT_OUTPUT_DIR } from '../constants';
import { addViewportsToStoriesFiles } from './set-viewports';

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);
const configDir = path.resolve(__dirname, '../storybook-config');

run();

async function run() {
  try {
    // When Playright projects are used, they override each others *.stories.json files. Re-apply viewports based on generated archives.
    // Proper fix would be to prefix each *.stories.json file with the project name (like Vitest integration does), but that's breaking change.
    await addViewportsToStoriesFiles();

    await archiveStorybook(args, configDir, DEFAULT_OUTPUT_DIR);
  } catch (err) {
    // Throwing the error results in a large output of minified code and a stacktrace that is
    // likely not helpful to users, so this should hide the noise.

    console.error(err.message);
    process.exitCode = 1;
  }
}
