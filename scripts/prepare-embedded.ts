/**
 * Populates embedded/ by copying @storybook/builder-webpack5, @storybook/server,
 * @storybook/server-webpack5 and their transitive deps (excluding the target
 * package's own dependencies) from the monorepo's node_modules. Run from repo root.
 * Usage: jiti scripts/prepare-embedded.ts [playwright] [cypress]
 * With no args: runs for both playwright and cypress.
 */
import path from 'node:path';
import fs from 'node:fs';
import { styleText } from 'node:util';

const DEFAULT_PACKAGE_NAMES = ['playwright', 'cypress', 'vitest'];

function runForPackage(pkgDir: string): void {
  const embeddedDir = path.join(pkgDir, 'embedded', 'node_modules');

  if (fs.existsSync(path.join(pkgDir, 'embedded'))) {
    fs.rmSync(path.join(pkgDir, 'embedded'), { recursive: true });
  }

  fs.mkdirSync(embeddedDir, { recursive: true });

  console.log('Embedding packages into', styleText('bgGreen', embeddedDir));
  console.log('from', styleText('bgGreen', path.join(process.cwd(), 'embedded', 'node_modules')));

  fs.cpSync(path.join(process.cwd(), 'embedded', 'node_modules'), embeddedDir, { recursive: true });
}

function main(): void {
  const args = process.argv.slice(2);
  const packageNames = args.length > 0 ? args : DEFAULT_PACKAGE_NAMES;
  const root = process.cwd();

  for (const name of packageNames) {
    const pkgDir = path.resolve(root, 'packages', name);
    if (!fs.existsSync(pkgDir)) {
      console.warn(`Skipping missing package directory: ${pkgDir}`);
      continue;
    }
    runForPackage(pkgDir);
  }
}

main();
