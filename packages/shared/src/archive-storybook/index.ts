import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { resolve, dirname } from 'path';
import { pathToFileURL } from 'url';
import { checkArchivesDirExists } from '../utils/filePaths';
import { addViewportsToStoriesFiles } from './viewports';

// ESM: use import.meta.url. CJS: use __filename (Node provides it when running as CommonJS).
declare const __filename: string;
const moduleURL = typeof require !== 'undefined' ? pathToFileURL(__filename).href : import.meta.url;
const req = createRequire(moduleURL);

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
  const packageJson = req('storybook/package.json');
  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  return resolve(dirname(req.resolve('storybook/package.json')), packageJson.bin);
}
