import path from 'node:path';
import { createRequire } from 'node:module';

/**
 * Directory of the `node_modules` that contains the `storybook` package this package depends on.
 *
 * Storybook's webpack builder places its virtual entry modules in the user's project root, so
 * their imports (e.g. `storybook/internal/csf`) are resolved by walking up from there. With
 * pnpm's isolated linker the user's `node_modules` only contains their own direct dependencies,
 * so `storybook` is not reachable and the build fails (chromaui/chromatic-e2e#416). Adding this
 * directory as a `resolve.modules` fallback makes those imports resolve to the same `storybook`
 * install this package uses, regardless of package manager or hoisting settings.
 */
export function storybookParentNodeModulesDir(importMetaUrl: string): string | null {
  const require = createRequire(importMetaUrl);
  const dir = path.dirname(path.dirname(require.resolve('storybook/package.json')));

  // If `storybook` resolves through a link to a source checkout (e.g. `pnpm link`, `portal:`),
  // its parent directory is not a node_modules dir and its siblings are not packages, so it
  // must not be offered to webpack as a module directory.
  return path.basename(dir) === 'node_modules' ? dir : null;
}
