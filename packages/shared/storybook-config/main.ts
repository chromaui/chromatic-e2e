import path from 'path';
import { archivesDir } from '@chromaui/shared-e2e';

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
export default {
  stories: [path.resolve(archivesDir(), '*.stories.json')],
  addons: ['@storybook/addon-essentials', '.'],
  framework: {
    name: '@storybook/server-webpack5',
    options: {},
  },
  staticDirs: [path.resolve(archivesDir(), 'archive')],
};
