const path = require('path');
const { archivesDir } = require('../dist/filePaths');

/** @type { import('@storybook/server-webpack5').StorybookConfig } */
const config = {
  stories: [path.resolve(archivesDir(), '*.stories.json')],
  addons: ['@storybook/addon-essentials', '../dist'],
  framework: {
    name: '@storybook/server-webpack5',
    options: {},
  },
  staticDirs: [path.resolve(archivesDir(), 'archive')],
};
module.exports = config;
