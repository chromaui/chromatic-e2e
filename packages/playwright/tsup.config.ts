import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: [
    'src/index.ts',
    'src/bin/archive-storybook.ts',
    'src/bin/build-archive-storybook.ts',
    'src/storybook-config/*.ts',
  ],
  splitting: false,
  minify: !options.watch,
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  treeshake: true,
  sourcemap: true,
  clean: true,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
}));
