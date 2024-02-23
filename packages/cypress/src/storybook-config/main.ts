import path from 'path';
import { archivesDir } from '@chromatic-com/shared-e2e/utils/filePaths';

function getAbsolutePath(value: string) {
  return path.dirname(require.resolve(path.join(value, 'package.json')));
}

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
export default {
  stories: [path.resolve(archivesDir(), '*.stories.json')],
  addons: [getAbsolutePath('@storybook/addon-essentials'), '.'],
  framework: {
    name: getAbsolutePath('@storybook/server-webpack5'),
    options: {},
  },
  staticDirs: [path.resolve(archivesDir(), 'archive')],
};
