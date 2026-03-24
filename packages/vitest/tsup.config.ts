import { defineConfig } from 'tsup';

export default defineConfig([
  {
    name: 'CJS Node',
    entry: {
      'bin/archive-storybook': 'src/bin/archive-storybook.ts',
      'bin/build-archive-storybook': 'src/bin/build-archive-storybook.ts',
    },
    platform: 'node',
    format: 'cjs',
    splitting: false,
    minify: false,
  },
  {
    name: 'ESM Node',
    entry: {
      'storybook-config/main': 'src/storybook-config/main.ts',
      plugin: 'src/node/plugin.ts',
      setupFile: 'src/browser/setupFile.ts',
    },
    platform: 'node',
    format: 'esm',
    outExtension: () => ({ js: '.mjs' }),
    splitting: false,
    minify: false,
    dts: { resolve: true },
  },
  {
    name: 'ESM Browser',
    entry: {
      index: 'src/index.ts',
      'storybook-config/manager': 'src/storybook-config/shared/manager.ts',
      'storybook-config/preview': 'src/storybook-config/shared/preview.ts',
    },
    platform: 'browser',
    format: 'esm',
    outExtension: () => ({ js: '.mjs' }),
    splitting: false,
    dts: { resolve: true },
    minify: false,
  },
]);
