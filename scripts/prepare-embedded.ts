/**
 * Populates embedded/ by copying @storybook/builder-webpack5, @storybook/server,
 * @storybook/server-webpack5 and their transitive deps. Run from repo root.
 * Usage: jiti scripts/prepare-embedded.ts [playwright] [cypress] [vitest]
 * With no args: runs for cypress, playwright and vitest.
 */
import path from 'node:path';
import fs from 'node:fs';
import { styleText } from 'node:util';

const DEFAULT_PACKAGE_NAMES = ['playwright', 'cypress', 'vitest'];

const args = process.argv.slice(2);
const packageNames = args.length > 0 ? args : DEFAULT_PACKAGE_NAMES;
const root = process.cwd();

for (const name of packageNames) {
  const pkgDir = path.resolve(root, 'packages', name);

  if (!fs.existsSync(pkgDir)) {
    throw new Error(`Missing package directory: ${pkgDir}`);
  }

  runForPackage(pkgDir);
}

function runForPackage(pkgDir: string): void {
  const targetDir = path.join(pkgDir, 'embedded', 'node_modules');
  const sourceDir = path.join(process.cwd(), 'embedded', 'node_modules');

  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true });
  }

  fs.mkdirSync(targetDir, { recursive: true });

  console.log('Embedding packages into', styleText('bgGreen', targetDir));
  console.log('from', styleText('bgGreen', sourceDir));

  fs.cpSync(sourceDir, targetDir, { recursive: true });
}
