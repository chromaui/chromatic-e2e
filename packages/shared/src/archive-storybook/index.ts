import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { checkArchivesDirExists } from '../utils/filePaths';
import { addViewportsToStoriesFiles } from './viewports';

const req = require.resolve ? require : createRequire(import.meta.url);

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
  const filename = req.resolve('storybook/package.json');
  const packageJson = JSON.parse(readFileSync(filename, 'utf8'));

  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  return resolve(dirname(filename), packageJson.bin);
}
