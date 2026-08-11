import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { checkArchivesDirExists } from '../utils/filePaths';

interface Callbacks {
  onArchivesCheck: (error?: unknown) => void;
}

const req = require.resolve ? require : createRequire(import.meta.url);

export async function archiveStorybook(
  processArgs: string[],
  configDir: string,
  defaultOutputDir: string,
  callbacks?: Callbacks
) {
  assertOutputDirectory(defaultOutputDir, callbacks);

  await runBin([binPath(), 'dev', ...processArgs, '-c', configDir]);
}

export async function buildArchiveStorybook(
  processArgs: string[],
  configDir: string,
  defaultOutputDir: string,
  callbacks?: Callbacks
) {
  assertOutputDirectory(defaultOutputDir, callbacks);

  await runBin([binPath(), 'build', ...processArgs, '-c', configDir]);
}

function assertOutputDirectory(outputDirectory: string, callbacks?: Callbacks) {
  try {
    checkArchivesDirExists(outputDirectory);
  } catch (error) {
    callbacks?.onArchivesCheck(error);
    throw error;
  }

  callbacks?.onArchivesCheck();
}

function runBin(args: string[]): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', args, { stdio: 'inherit' });

    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolvePromise();
      } else {
        reject(
          Object.assign(new Error(`Storybook exited with ${signal ?? `code ${code}`}`), {
            status: code,
          })
        );
      }
    });
  });
}

function binPath() {
  const filename = req.resolve('storybook/package.json');
  const packageJson = JSON.parse(readFileSync(filename, 'utf8'));

  // reference the entry file based on the package.json `bin` value, since it changed between SB 8.1 and 8.2
  return resolve(dirname(filename), packageJson.bin);
}
