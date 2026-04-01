import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';
import { DEFAULT_OUTPUT_DIR } from '../constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve embedded Storybook 10.x stack from package root (dist/storybook-config -> .. -> ..)
const packageRoot = path.resolve(__dirname, '..', '..');
const embeddedDir = path.join(packageRoot, 'embedded', 'node_modules');

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
export default {
  stories: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), '*.stories.json')],
  managerEntries: [path.resolve(__dirname, 'manager.mjs')],
  previewAnnotations: [path.resolve(__dirname, 'preview.mjs')],
  framework: {
    name: path.join(embeddedDir, '@storybook', 'server-webpack5'),
    options: {},
  },
  core: {
    // ESM does not support directory imports; point to the package entry file.
    builder: pathToFileURL(path.join(embeddedDir, '@storybook', 'builder-webpack5', 'dist', 'index.js')).href,
    renderer: pathToFileURL(path.join(embeddedDir, '@storybook', 'server', 'preset.js')).href,
  },
  staticDirs: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), 'archive')],
};
