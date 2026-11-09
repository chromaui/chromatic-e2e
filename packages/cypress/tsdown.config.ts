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
} satisfies UserConfig;

export default defineConfig([
  {
    ...defaults,
    name: "Node",
    copy: [{ from: "../archive-storybook/dist/storybook-static" }],
    entry: {
      index: "src/index.ts",
      support: "src/support.ts",
      "bin/archive-storybook": "src/bin/archive-storybook.ts",
      "bin/build-archive-storybook": "src/bin/build-archive-storybook.ts",
    },
    dts: {
      entry: ["src/index.ts", "src/support.ts"],
      // tsgolint rejects `baseUrl` in tsconfig files, but tsdown's dts type inference needs it:
      compilerOptions: { baseUrl: "../.." },
    },
    deps: {
      // Story IDs and tags must match Storybook's. Bundle the utilities, so end users don't need `storybook` installed.
      alwaysBundle: ["storybook/internal/csf/csf-utils"],
      onlyBundle: ["@rrweb/types", "mime", "srcset", "storybook"],

      // Fails the build if the output imports anything else, e.g. `storybook` after a Storybook upgrade
      onlyImport: ["@chromaui/rrweb-snapshot", "chrome-remote-interface"],
    },
    outputOptions: {
      ...defaults.outputOptions,

      // Keep bundled Storybook code in its own chunk, so that its contents are easy to verify
      codeSplitting: { groups: [{ name: "storybook", test: /node_modules[\\/]storybook[\\/]/ }] },
    },
  },
]);
