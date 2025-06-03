import path from 'path';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';
import { DEFAULT_OUTPUT_DIR } from '../constants';

function getAbsolutePath(value: string) {
  return path.dirname(require.resolve(path.join(value, 'package.json')));
}

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
export default {
  stories: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), '*.stories.json')],
  addons: [getAbsolutePath('@storybook/addon-essentials'), '.'],
  framework: path.join(getAbsolutePath('@chromatic-com/playwright'), 'dist', 'storybook-framework'),
  staticDirs: [path.resolve(archivesDir(DEFAULT_OUTPUT_DIR), 'archive')],
};
