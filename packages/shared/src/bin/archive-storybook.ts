#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { checkArchivesDirExists } from '../archive-storybook/filePaths';

checkArchivesDirExists();

// Discard first two entries (exec path and file path)
const args = process.argv.slice(2);

const configDir = 'node_modules/@chromaui/archive-storybook/config';
const binPath = resolve(dirname(require.resolve('@storybook/cli/package.json')), './bin/index.js');
execFileSync('node', [binPath, 'dev', ...args, '-c', configDir], { stdio: 'inherit' });
