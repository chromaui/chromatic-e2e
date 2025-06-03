// ------------------------------------------------------------
// Copied from @storybook/server-webpack5/preset.ts
// https://github.com/storybookjs/storybook/blob/a0d1b3e62533fbf531b79ddfd1f5856fa5bf7384/code/frameworks/server-webpack5/src/preset.ts
// ------------------------------------------------------------

import { dirname, join } from 'node:path';

const getAbsolutePath = <I extends string>(input: I): I =>
  dirname(require.resolve(join(input, 'package.json'))) as any;

// 👇 Not necessary since preset-server-webpack is inlined below
// export const addons: PresetProperty<'addons'> = [
//   getAbsolutePath('@storybook/preset-server-webpack'),
// ];

export const core = async (config: any, options: any) => {
  const framework = await options.presets.apply('framework');

  return {
    ...config,
    builder: {
      name: getAbsolutePath('@storybook/builder-webpack5'),
      options: typeof framework === 'string' ? {} : framework.options.builder || {},
    },
    renderer: getAbsolutePath('@storybook/server'),
  };
};

// ------------------------------------------------------------
// Copied from @storybook/preset-server-webpack/index.ts
// https://github.com/storybookjs/storybook/blob/a0d1b3e62533fbf531b79ddfd1f5856fa5bf7384/code/presets/server-webpack/src/index.ts
// ------------------------------------------------------------
import type { StorybookConfig } from '@storybook/core-webpack';

export const webpack: StorybookConfig['webpack'] = (config) => {
  const packageName = require('../../package.json').name;
  const rules = [
    ...(config.module?.rules || []),
    {
      type: 'javascript/auto',
      test: /\.stories\.json$/,
      use: join(__dirname, 'loader.js'),
    },
    {
      type: 'javascript/auto',
      test: /\.stories\.ya?ml/,
      use: [
        join(__dirname, 'loader.js'),
        {
          loader: require.resolve('yaml-loader'),
          options: { asJSON: true },
        },
      ],
    },
  ];

  config.module = config.module || {};

  config.module.rules = rules;

  return config;
};
