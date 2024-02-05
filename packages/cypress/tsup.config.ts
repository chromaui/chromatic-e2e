import { defineConfig } from 'tsup';

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
  },
  // These are all node scripts so we keep it simple and only generate CJS.
  // In particular SB will warn if we generate both CJS+ESM main files
  {
    ...common(options),
    entry: [
      'src/bin/archive-storybook.ts',
      'src/bin/build-archive-storybook.ts',
      'src/storybook-config/main.ts',
      'src/storybook-config/manager.ts',
    ],
    format: ['cjs'],
    platform: 'node',
  },
  // This is a SB browser file so ESM is better.
  {
    ...common(options),
    entry: ['src/storybook-config/preview.ts'],
    outDir: 'dist/storybook-config',
    format: ['esm'],
    platform: 'browser',
  },
]);
