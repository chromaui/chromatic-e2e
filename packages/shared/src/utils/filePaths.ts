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

// 255 bytes is a good upper bound on file name size to work on most platforms
export const MAX_FILE_NAME_BYTE_LENGTH = 255;

// Ensures that the file name part on the given `filePath` is not longer
// than the given `maxByteLength`.
// If truncation is necessary, a hash is added to avoid collisions on the
// file system in cases where names match up until a differentiating part
// at the end that is truncated.
export function truncateFileName(
  filePath: string,
  maxByteLength: number = MAX_FILE_NAME_BYTE_LENGTH
) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const filePathParts = filePath.split('/');
  const fileName = filePathParts.pop();

  const fileNameByteArray = encoder.encode(fileName);
  if (fileNameByteArray.byteLength <= maxByteLength) {
    return filePath;
  }

  const hashedFileName = hash(fileName);
  const [baseName, ...extensions] = fileName.split('.');
  const baseNameByteArray = encoder.encode(baseName);
  const ext = extensions.join('.');
  const extLength = ext.length === 0 ? 0 : encoder.encode(ext).byteLength + 1; // +1 for leading `.` if needed

  const lengthHashAndExt = encoder.encode(hashedFileName).byteLength + extLength;
  const truncatedBaseNameByteArray = baseNameByteArray.slice(0, maxByteLength - lengthHashAndExt);
  const truncatedBaseName = decoder.decode(truncatedBaseNameByteArray);
  const truncatedFileName = [`${truncatedBaseName}${hashedFileName}`, ext]
    .filter(Boolean)
    .join('.');

  return [...filePathParts, truncatedFileName].join('/');
}

/**
 * The <base> HTML element specifies the base URL to use for all relative URLs in a document.
 * This is used to rewrite the base href in the DOM snapshot to not include localhost.
 */
export const removeLocalhostFromBaseUrl = (href: string) => {
  let baseUrl;
  try {
    baseUrl = new URL(href);
    if (baseUrl.hostname === 'localhost') {
      return baseUrl.pathname;
    }
    return href;
  } catch (error) {
    // If the base ref is not a valid URL, we return the original href since it could be a relative path
    return href;
  }
};
