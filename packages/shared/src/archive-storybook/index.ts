import { execFileSync, spawnSync } from 'child_process';
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
    // execFileSync('node', [binPath(), 'build', ...processArgs, '-c', configDir], {
    //   stdio: 'inherit',
    // });
    spawnSync(
      `npx storybook@latest build ${processArgs.join(' ')} -c ${configDir} --loglevel verbose`
    );
  });
}

function binPath() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const packageJson = require('storybook/package.json');
  const parsedVersion = parseInt(packageJson.version[0], 10);
  const storybookPackageJsonHasBinObject = parsedVersion >= 9;
  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  return resolve(
    dirname(require.resolve('storybook/package.json')),
    storybookPackageJsonHasBinObject ? packageJson.bin : packageJson.bin.storybook
  );
}
