import { defineConfig, type UserConfig } from 'tsdown';

const defaults = {
  format: ['esm'],
  platform: 'node',
  target: 'esnext',
  tsconfig: './tsconfig.json',
  outputOptions: { comments: false },
  minify: false,
  clean: true,
  fixedExtension: true,

  // tsgolint rejects `baseUrl` in tsconfig files, but tsdown's dts type inference needs it:
  dts: { compilerOptions: { baseUrl: '../..' } },
} satisfies UserConfig;

export default defineConfig([
  {
    ...defaults,
    name: 'Node',
    entry: {
      plugin: 'src/node/plugin.ts',
      'bin/archive-storybook': 'src/bin/archive-storybook.ts',
      'bin/build-archive-storybook': 'src/bin/build-archive-storybook.ts',
      'storybook-config/main': 'src/storybook-config/main.ts',
    },
    dts: { ...defaults.dts, entry: ['src/node/plugin.ts'] },
    deps: { onlyBundle: ['@rrweb/types', 'mime', 'srcset'] },
  },
  {
    ...defaults,
    name: 'Browser',
    entry: {
      index: 'src/index.ts',
      setupFile: 'src/browser/setupFile.ts',
      'storybook-config/manager': 'src/storybook-config/shared/manager.ts',
      'storybook-config/preview': 'src/storybook-config/shared/preview.ts',
    },
    platform: 'browser',
    dts: { ...defaults.dts, entry: ['src/index.ts'] },
    deps: { onlyBundle: ['@rrweb/types'] },
  },
]);
