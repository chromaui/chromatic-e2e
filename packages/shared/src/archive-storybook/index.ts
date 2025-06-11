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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const packageJson = require('storybook/package.json');

  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  // `bin` is a string in SB 9 but an object in previous versions
  const storybookBinScript = packageJson.bin.storybook || packageJson.bin;
  const storybookDir = dirname(require.resolve('storybook/package.json'));
  return resolve(storybookDir, storybookBinScript);
}
