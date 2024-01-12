import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/archive-storybook/index.ts', 'src/util/filePaths.ts'],
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
