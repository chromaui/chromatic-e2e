import fs from 'fs';
import path from 'path';

const { CHROMATIC_ARCHIVE_LOCATION = 'test-results' } = process.env;

function rootDir() {
  return process.cwd();
}

export function archivesDir() {
  return path.resolve(rootDir(), CHROMATIC_ARCHIVE_LOCATION, 'chromatic-archives');
}

export function checkArchivesDirExists() {
  const dir = archivesDir();
  if (!fs.existsSync(dir)) {
    throw new Error(
      `Chromatic archives directory cannot be found: ${dir}\n\nPlease make sure that you have run your E2E tests, or have set the CHROMATIC_ARCHIVE_LOCATION env var if the output directory for the tests is not in the standard location.`
    );
  }
}
