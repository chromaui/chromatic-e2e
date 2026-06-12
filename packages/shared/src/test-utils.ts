// v8 ignore file -- @preserve
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface EmbeddedPackage {
  relDir: string;
  absDir: string;
  name: string;
  version: string;
}

export function collectEmbeddedFiles(packageRoot: string) {
  const embeddedRoot = path.join(packageRoot, 'embedded', 'node_modules');

  return collectPackages(embeddedRoot, embeddedRoot)
    .sort((a, b) => a.relDir.localeCompare(b.relDir))
    .map((pkg) => `${pkg.relDir}@${pkg.version}`);
}

export function generateEmbeddedChecksum(packageRoot: string) {
  const embeddedRoot = path.join(packageRoot, 'embedded', 'node_modules');
  const files = collectFiles(embeddedRoot, embeddedRoot).sort((a, b) => a.rel.localeCompare(b.rel));

  const hash = createHash('sha256');
  for (const { abs, rel } of files) {
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(abs));
    hash.update('\0');
  }

  return { hash: hash.digest('hex'), fileCount: files.length };
}

function collectPackages(
  embeddedRoot: string,
  nodeModulesDir: string,
  into: EmbeddedPackage[] = []
): EmbeddedPackage[] {
  if (!fs.existsSync(nodeModulesDir)) {
    return into;
  }

  for (const entry of fs.readdirSync(nodeModulesDir, { withFileTypes: true })) {
    if (entry.name === '.bin' || !entry.isDirectory()) continue;

    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(nodeModulesDir, entry.name);

      for (const sub of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (sub.isDirectory()) {
          addPackage(embeddedRoot, path.join(scopeDir, sub.name), into);
        }
      }
    } else {
      addPackage(embeddedRoot, path.join(nodeModulesDir, entry.name), into);
    }
  }

  return into;
}

function addPackage(embeddedRoot: string, absDir: string, into: EmbeddedPackage[]): void {
  const packageJson = JSON.parse(fs.readFileSync(path.join(absDir, 'package.json'), 'utf8'));

  into.push({
    relDir: path.relative(embeddedRoot, absDir).split(path.sep).join('/'),
    absDir,
    name: packageJson.name,
    version: packageJson.version,
  });

  collectPackages(embeddedRoot, path.join(absDir, 'node_modules'), into);
}

function collectFiles(
  embeddedRoot: string,
  dir: string,
  into: { abs: string; rel: string }[] = []
) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      collectFiles(embeddedRoot, abs, into);
    } else if (entry.isFile()) {
      into.push({
        abs,
        rel: path.relative(embeddedRoot, abs).split(path.sep).join('/'),
      });
    }
  }

  return into;
}
