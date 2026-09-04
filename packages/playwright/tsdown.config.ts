import { defineConfig, type UserConfig } from 'tsdown';

const defaults: UserConfig = {
  format: ['esm'],
  platform: 'node',
  target: 'esnext',
  tsconfig: './tsconfig.json',
  outputOptions: { comments: false },
  minify: false,
  clean: true,
  fixedExtension: true,
};

export default defineConfig([
  {
    ...defaults,
    name: 'Node',
    entry: {
      index: 'src/index.ts',
      'bin/archive-storybook': 'src/bin/archive-storybook.ts',
      'bin/build-archive-storybook': 'src/bin/build-archive-storybook.ts',
      'storybook-config/main': 'src/storybook-config/main.ts',
    },
    dts: { entry: ['src/index.ts'] },
    deps: { onlyBundle: ['@rrweb/types', 'mime', 'srcset'] },
  },
  {
    ...defaults,
    name: 'Browser',
    entry: {
      'storybook-config/manager': 'src/storybook-config/shared/manager.ts',
      'storybook-config/preview': 'src/storybook-config/shared/preview.ts',
    },
    platform: 'browser',
    deps: { onlyBundle: ['@rrweb/types'] },
  },

  /**
   * This must be its own config, as Playwright runs it via `page.evaluate()`.
   * We need to make sure no code splitting is done.
   */
  {
    ...defaults,
    name: 'Browser Playwright Script',
    entry: { browser: 'src/browser.ts' },
    platform: 'browser',
    outputOptions: { ...defaults.outputOptions, codeSplitting: false },
    deps: {
      alwaysBundle: ['@chromaui/rrweb-snapshot'],
      onlyBundle: ['@chromaui/rrweb-snapshot', '@rrweb/types'],
    },
  },
]);
