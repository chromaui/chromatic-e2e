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
  const packageJsonPath = require.resolve('storybook/package.json');
  // eslint-disable-next-line global-require
  const packageJson = require(packageJsonPath);
  const storybookRootDir = dirname(packageJsonPath);

  // Storybook's "bin" can be either:
  // - a string (SB 10), or
  // - an object with keys like "storybook" (SB 8/9), or possibly "sb"
  const binField = packageJson.bin;

  let relativeBinPath: string | undefined;
  if (typeof binField === 'string') {
    relativeBinPath = binField;
  } else if (binField && typeof binField === 'object') {
    relativeBinPath = binField.storybook || binField.sb || Object.values(binField)[0];
  }

  if (relativeBinPath) {
    return resolve(storybookRootDir, relativeBinPath);
  }

  // Fallbacks for unexpected shapes/versions
  try {
    // Common location in some versions
    // eslint-disable-next-line global-require
    return require.resolve('storybook/bin/index.js');
  } catch {
    // ignore
  }

  try {
    // Another common location
    // eslint-disable-next-line global-require
    return require.resolve('storybook/dist/bin/index.js');
  } catch {
    // ignore
  }

  throw new Error(
    'Unable to resolve Storybook CLI binary. Could not determine "bin" from storybook/package.json.'
  );
}
