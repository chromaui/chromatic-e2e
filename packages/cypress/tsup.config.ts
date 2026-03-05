import { Options, defineConfig } from 'tsup';

const common: Partial<Options> = {
  splitting: false,
  dts: {
    resolve: true,
  },
  treeshake: true,
  minify: false,
  clean: false, // This set to `true` caused a race condition since we're running multiple builds below
};

export default defineConfig((options) => [
  // We want the cypress functions to be importable from both CJS or ESM files
  {
    ...common,
    entry: ['src/index.ts', 'src/support.ts'],
    format: ['cjs', 'esm'],
    platform: 'node',
    esbuildOptions(options) {
      options.conditions = ['module'];
    },
  },
  // These are all node scripts so we keep it simple and only generate CJS.
  // In particular SB will warn if we generate both CJS+ESM main files
  {
    ...common,
    entry: {
      'bin/archive-storybook': 'src/bin/archive-storybook.ts',
      'bin/build-archive-storybook': 'src/bin/build-archive-storybook.ts',
      'storybook-config/main': 'src/storybook-config/main.ts',
      'storybook-config/manager': 'src/storybook-config/shared/manager.ts',
    },
    format: ['cjs'],
    platform: 'node',
    minify: false,
    esbuildOptions(options) {
      options.conditions = ['module'];
    },
  },
  // This is a SB browser file so ESM is better.
  {
    ...common,
    entry: {
      'storybook-config/preview': 'src/storybook-config/shared/preview.ts',
    },
    format: ['esm'],
    platform: 'browser',
    esbuildOptions(options) {
      options.conditions = ['module'];
    },
  },
]);
