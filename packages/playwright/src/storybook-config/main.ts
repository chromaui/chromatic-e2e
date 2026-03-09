import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';

import { DEFAULT_OUTPUT_DIR } from '../constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function getAbsolutePath(value: string) {
  return path.dirname(require.resolve(path.join(value, 'package.json')));
}

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
export default {
  stories: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), '*.stories.json')],
  managerEntries: [path.resolve(__dirname, 'manager.js')],
  projectAnnotations: [path.resolve(__dirname, 'preview.js')],
  framework: {
    name: getAbsolutePath('@storybook/server-webpack5'),
    options: {},
  },
  core: {
    builder: import.meta.resolve('@storybook/server-webpack5'),
  },
  staticDirs: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), 'archive')],
};
