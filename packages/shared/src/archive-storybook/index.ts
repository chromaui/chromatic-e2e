import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { checkArchivesDirExists } from '../utils/filePaths';
import { addViewportsToStoriesFiles } from './viewports';

export function archiveStorybook(
  processArgs: string[],
  configDir: string,
  defaultOutputDir: string
) {
  checkArchivesDirExists(defaultOutputDir);
  addViewportsToStoriesFiles(defaultOutputDir).then(() => {
    execFileSync('node', [binPath(), 'dev', ...processArgs, '-c', configDir], { stdio: 'inherit' });
  });
}

export function buildArchiveStorybook(
  processArgs: string[],
  configDir: string,
  defaultOutputDir: string
) {
  checkArchivesDirExists(defaultOutputDir);
  addViewportsToStoriesFiles(defaultOutputDir).then(() => {
    execFileSync('node', [binPath(), 'build', ...processArgs, '-c', configDir], {
      stdio: 'inherit',
    });
  });
}

function binPath() {
  // eslint-disable-next-line global-require
  const packageJson = require('storybook/package.json');
  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  return resolve(dirname(require.resolve('storybook/package.json')), packageJson.bin);
}
