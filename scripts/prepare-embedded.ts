/**
 * Populates embedded/ by copying @storybook/builder-webpack5, @storybook/server,
 * @storybook/server-webpack5 and their transitive deps (excluding the target
 * package's own dependencies) from the monorepo's node_modules. Run from repo root.
 * Usage: jiti scripts/prepare-embedded.ts [playwright] [cypress]
 * With no args: runs for both playwright and cypress.
 */
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const PACKAGES_TO_EMBED = [
  '@storybook/builder-webpack5',
  '@storybook/server',
  '@storybook/server-webpack5',
];

const DEFAULT_PACKAGE_NAMES = ['playwright', 'cypress'];

function resolvePackagePath(req: NodeRequire, packageId: string): string | null {
  try {
    const p = req.resolve(`${packageId}/package.json`);
    return path.dirname(p);
  } catch {
    return null;
  }
}

function getPackageNameAndDeps(absDir: string): { name: string; deps: string[] } | null {
  const pkgPath = path.join(absDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
    name: string;
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  const deps = {
    ...pkg.dependencies,
    ...(pkg.optionalDependencies || {}),
  };
  return { name: pkg.name, deps: Object.keys(deps || {}) };
}

function gatherAllPackages(req: NodeRequire, excludePackages: Set<string>): Map<string, string> {
  const byPath = new Map<string, string>();
  const processed = new Set<string>();
  const queue = [...PACKAGES_TO_EMBED];

  while (queue.length) {
    const packageId = queue.shift()!;
    if (processed.has(packageId)) continue;
    const absDir = resolvePackagePath(req, packageId);
    if (!absDir) continue;
    const realPath = fs.realpathSync(absDir);
    if (byPath.has(realPath)) continue;

    const info = getPackageNameAndDeps(realPath);
    if (!info) continue;
    byPath.set(realPath, info.name);
    processed.add(packageId);
    processed.add(info.name);

    for (const dep of info.deps) {
      if (excludePackages.has(dep)) continue;
      if (!processed.has(dep)) queue.push(dep);
    }
  }

  return byPath;
}

function copyPackage(realPath: string, packageName: string, embeddedDir: string): void {
  const parts = packageName.startsWith('@') ? packageName.split('/') : [packageName];
  const destDir = path.join(embeddedDir, ...parts);
  fs.mkdirSync(path.dirname(destDir), { recursive: true });
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }
  fs.cpSync(realPath, destDir, { recursive: true });
}

function runForPackage(pkgDir: string): void {
  const req = createRequire(path.join(pkgDir, 'package.json'));
  const embeddedDir = path.join(pkgDir, 'embedded', 'node_modules');
  if (fs.existsSync(path.join(pkgDir, 'embedded'))) {
    fs.rmSync(path.join(pkgDir, 'embedded'), { recursive: true });
  }
  fs.mkdirSync(embeddedDir, { recursive: true });

  const pkgPath = path.join(pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { dependencies?: Record<string, string> };
  const excludePackages = new Set(Object.keys(pkg.dependencies || {}));

  const byPath = gatherAllPackages(req, excludePackages);
  for (const [realPath, packageName] of byPath) {
    copyPackage(realPath, packageName, embeddedDir);
  }
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
