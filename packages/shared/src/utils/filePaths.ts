import fs from 'fs';
import path from 'path';

function rootDir() {
  return process.cwd();
}

function outputDirOverride() {
  const { CHROMATIC_ARCHIVE_LOCATION } = process.env;
  return CHROMATIC_ARCHIVE_LOCATION;
}

export function archivesDir(defaultOutputDir: string) {
  const outputDir = outputDirOverride() || defaultOutputDir;
  return path.resolve(rootDir(), outputDir, 'chromatic-archives');
}

export function assetsDir(defaultOutputDir: string) {
  return path.resolve(archivesDir(defaultOutputDir), 'archive');
}

export function checkArchivesDirExists(defaultOutputDir: string) {
  const dir = archivesDir(defaultOutputDir);
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Chromatic archives directory cannot be found: ${dir}\n\nPlease make sure that you have run your E2E tests, or have set the CHROMATIC_ARCHIVE_LOCATION env var if the output directory for the tests is not in the standard location.`
    );
  }
}
