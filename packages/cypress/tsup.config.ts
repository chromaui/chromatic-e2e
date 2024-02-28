import { Options, defineConfig } from 'tsup';

const common = (options) => ({
  minify: !options.watch,
  splitting: false,
  dts: {
    resolve: true,
  },
  treeshake: true,
  sourcemap: true,
  clean: true,
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
});

export default defineConfig((options) => [
  // We want the cypress functions to be importable from both CJS or ESM files
  {
    ...common(options),
    entry: ['src/index.ts', 'src/support.ts'],
    format: ['cjs', 'esm'],
    platform: 'node',
  } as Options,
  // These are all node scripts so we keep it simple and only generate CJS.
  // In particular SB will warn if we generate both CJS+ESM main files
  {
    ...common(options),
    entry: {
      'bin/archive-storybook': 'src/bin/archive-storybook.ts',
      'bin/build-archive-storybook': 'src/bin/build-archive-storybook.ts',
      'storybook-config/main': 'src/storybook-config/main.ts',
      'storybook-config/manager': 'src/storybook-config/shared/manager.ts',
    },
    format: ['cjs'],
    platform: 'node',
  } as Options,
  // This is a SB browser file so ESM is better.
  {
    ...common(options),
    entry: {
      'storybook-config/preview': 'src/storybook-config/shared/preview.ts',
    },
    format: ['esm'],
    platform: 'browser',
    // We need to be careful how we minimize `preview.ts` because the
    // SB indexer is quite particular about the format of `parameters`.
    minify: false,
  } as Options,
]);
