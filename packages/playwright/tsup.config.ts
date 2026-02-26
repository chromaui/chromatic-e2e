import { Options, defineConfig } from 'tsup';

const common = {
  splitting: false,
  dts: {
    resolve: true,
  },
  treeshake: true,
  minify: false,
  clean: false, // This set to `true` caused a race condition since we're running multiple builds below
  esbuildOptions(options: any) {
    options.conditions = ['module'];
  },
};

export default defineConfig((options) => [
  // We want the playwright functions to be importable from both CJS or ESM files
  {
    ...common,
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    platform: 'node',
    esbuildOptions(options) {
      options.conditions = ['module'];
      // `require.resolve` is used in `takeSnapshot`, but that is not available in ESM builds. This adds a shim
      // to allow that to work.
      options.banner = {
        js: "import { createRequire as topLevelCreateRequire } from 'module';\n const require = topLevelCreateRequire(import.meta.url);",
      };
    },
  } as Options,
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
  } as Options,
  // This is a SB browser file so ESM is better.
  {
    ...common,
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
