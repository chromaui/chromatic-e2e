import { defineConfig, type UserConfig } from "tsdown";

const defaults = {
  format: ["esm"],
  platform: "node",
  target: "esnext",
  tsconfig: "./tsconfig.json",
  outputOptions: { comments: false },
  minify: false,
  clean: true,
  fixedExtension: true,

  // tsgolint rejects `baseUrl` in tsconfig files, but tsdown's dts type inference needs it:
  dts: { compilerOptions: { baseUrl: "../.." } },
} satisfies UserConfig;

export default defineConfig([
  {
    ...defaults,
    name: "Node",
    copy: [{ from: "../archive-storybook/dist/storybook-static" }],
    entry: {
      plugin: "src/node/plugin.ts",
      "bin/archive-storybook": "src/bin/archive-storybook.ts",
      "bin/build-archive-storybook": "src/bin/build-archive-storybook.ts",
    },
    dts: { ...defaults.dts, entry: ["src/node/plugin.ts"] },
    deps: {
      // Story IDs and tags must match Storybook's. Bundle the utilities, so end users don't need `storybook` installed.
      alwaysBundle: ["storybook/internal/csf/csf-utils"],
      onlyBundle: ["@rrweb/types", "mime", "srcset", "storybook"],

      // Fails the build if the output imports anything else, e.g. `storybook` after a Storybook upgrade
      onlyImport: ["std-env", "tinyexec", "tinyrainbow", "vitest"],
    },
    outputOptions: {
      ...defaults.outputOptions,

      // Keep bundled Storybook code in its own chunk, so that its contents are easy to verify
      codeSplitting: { groups: [{ name: "storybook", test: /node_modules[\\/]storybook[\\/]/ }] },
    },
  },
  {
    ...defaults,
    name: "Browser",
    entry: {
      index: "src/index.ts",
      setupFile: "src/browser/setupFile.ts",
    },
    platform: "browser",
    dts: { ...defaults.dts, entry: ["src/index.ts"] },
    deps: { onlyBundle: ["@rrweb/types"] },
  },
]);
