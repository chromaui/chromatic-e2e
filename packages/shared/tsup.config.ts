import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/archive-storybook/index.ts', 'src/utils/filePaths.ts'],
  splitting: false,
  minify: false,
  format: ['esm', 'cjs'],
  dts: {
    resolve: true,
  },
  treeshake: true,
  clean: false,
  platform: 'node',
  esbuildOptions(options) {
    options.conditions = ['module'];
  },
}));
