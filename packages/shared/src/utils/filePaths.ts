import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
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
  return writeFile(filePath, data, { mode: 0o777 });
}

export async function outputJSONFile(filePath: string, data: any) {
  return outputFile(filePath, JSON.stringify(data));
}

export async function readJSONFile(filePath: string) {
  const data = await readFile(filePath);
  return JSON.parse(data.toString());
}
