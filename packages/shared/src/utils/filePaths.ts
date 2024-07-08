import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { createHash } from 'node:crypto';
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
  if (!existsSync(dir)) {
    throw new Error(
      `Chromatic archives directory cannot be found: ${dir}\n\nPlease make sure that you have run your E2E tests, or have set the CHROMATIC_ARCHIVE_LOCATION env var if the output directory for the tests is not in the standard location.`
    );
  }
}

export function ensureDir(directory: string) {
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
}

export async function outputFile(filePath: string, data: string | Buffer) {
  ensureDir(path.dirname(filePath));
  return writeFile(filePath, data, { mode: 0o777 });
}

export async function outputJSONFile(filePath: string, data: any) {
  return outputFile(filePath, JSON.stringify(data));
}

export async function readJSONFile(filePath: string) {
  const data = await readFile(filePath);
  return JSON.parse(data.toString());
}

// Generates a fixed length hash for the given `data`
function hash(data: string) {
  // `outputLength` of 2 bytes is 4 chars
  return createHash('shake256', { outputLength: 2 }).update(data).digest('hex');
}

// 255 is a good upper bound on file name size to work on most platforms
export const MAX_FILE_NAME_LENGTH = 255;

// Ensures that the file name part on the given `filePath` is not longer
// than the given `maxLength`. If truncation is necessary, a hash is added
// to avoid collisions on the file system.
export function truncateFileName(filePath: string, maxLength: number = MAX_FILE_NAME_LENGTH) {
  const filePathParts = filePath.split('/');
  const fileName = filePathParts.pop();
  if (fileName.length <= maxLength) {
    return filePath;
  }

  const hashedFileName = hash(fileName);
  const [baseName, ...extensions] = fileName.split('.');
  const ext = extensions.join('.');
  const extLength = ext.length === 0 ? 0 : ext.length + 1; // +1 for leading `.` if needed

  const lengthHashAndExt = hashedFileName.length + extLength;
  const truncatedBaseName = baseName.slice(0, maxLength - lengthHashAndExt);
  const truncatedFileName = [`${truncatedBaseName}${hashedFileName}`, ext]
    .filter(Boolean)
    .join('.');

  return [...filePathParts, truncatedFileName].join('/');
}
