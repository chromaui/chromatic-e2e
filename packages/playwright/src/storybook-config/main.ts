import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { StorybookConfig } from '@storybook/server-webpack5';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';
import { storybookParentNodeModulesDir } from '@chromatic-com/shared-e2e/utils/storybookPaths';
import { DEFAULT_OUTPUT_DIR } from '../constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve embedded Storybook 10.x stack from package root (dist/storybook-config -> .. -> ..)
const packageRoot = path.resolve(__dirname, '..', '..');
const embeddedDir = path.join(packageRoot, 'embedded', 'node_modules');

export default <StorybookConfig>{
  stories: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), '*.stories.json')],
  managerEntries: [path.resolve(__dirname, 'manager.mjs')],
  previewAnnotations: [path.resolve(__dirname, 'preview.mjs')],
  framework: {
    name: path.join(embeddedDir, '@storybook', 'server-webpack5'),
    options: {},
  },
  core: {
    // ESM does not support directory imports; point to the package entry file.
    builder: pathToFileURL(
      path.join(embeddedDir, '@storybook', 'builder-webpack5', 'dist', 'index.js')
    ).href,
    renderer: pathToFileURL(path.join(embeddedDir, '@storybook', 'server', 'preset.js')).href,
  },
  staticDirs: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), 'archive')],
  features: {
    sidebarOnboardingChecklist: false,
  },
  webpackFinal: async (config) => {
    // Storybook's virtual entry modules live in the user's project root, where imports like
    // `storybook/internal/csf` may not resolve by node_modules walk-up (e.g. with pnpm).
    // Fall back to the `storybook` install this package depends on.
    const storybookNodeModules = storybookParentNodeModulesDir(import.meta.url);
    if (storybookNodeModules) {
      config.resolve ??= {};
      config.resolve.modules = [
        ...(config.resolve.modules ?? ['node_modules']),
        storybookNodeModules,
      ];
    }

    return config;
  },
};
