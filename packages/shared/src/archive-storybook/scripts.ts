import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { checkArchivesDirExists } from './filePaths';

export function archiveStorybook(processArgs: string[]) {
  checkArchivesDirExists();

  const configDir = 'node_modules/@chromaui/archive-storybook/config';
  const binPath = resolve(
    dirname(require.resolve('@storybook/cli/package.json')),
    './bin/index.js'
  );
  execFileSync('node', [binPath, 'dev', ...processArgs, '-c', configDir], { stdio: 'inherit' });
}

export function buildArchiveStorybook(processArgs: string[]) {
  checkArchivesDirExists();

  const configDir = 'node_modules/@chromaui/archive-storybook/config';
  const binPath = resolve(
    dirname(require.resolve('@storybook/cli/package.json')),
    './bin/index.js'
  );
  execFileSync('node', [binPath, 'build', ...processArgs, '-c', configDir], { stdio: 'inherit' });
}
