import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { checkArchivesDirExists } from '../utils/filePaths';
import { addViewportsToStories } from '../viewports';

export function archiveStorybook(processArgs: string[], configDir: string) {
  checkArchivesDirExists();
  addViewportsToStories().then(() => {
    const binPath = resolve(dirname(require.resolve('storybook/package.json')), './index.js');
    execFileSync('node', [binPath, 'dev', ...processArgs, '-c', configDir], { stdio: 'inherit' });
  });
}

export function buildArchiveStorybook(processArgs: string[], configDir: string) {
  checkArchivesDirExists();
  addViewportsToStories().then(() => {
    const binPath = resolve(dirname(require.resolve('storybook/package.json')), './index.js');
    execFileSync('node', [binPath, 'build', ...processArgs, '-c', configDir], { stdio: 'inherit' });
  });
}
