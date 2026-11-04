import path from "node:path";

import type { Plugin } from "vite";

/**
 * Virtual module of `@storybook/builder-vite` that exports the `importFn` for all stories found at
 * build time. This is internal API: if it gets renamed, the build no longer uses our `importFn`
 * and the smoke tests fail.
 *
 * Usage of this will be removed after https://github.com/storybookjs/storybook/pull/37148.
 *
 * @see https://github.com/storybookjs/storybook/blob/next/code/builders/builder-vite/src/virtual-file-names.ts
 */
const VIRTUAL_STORIES_FILE = "virtual:/@storybook/builder-vite/storybook-stories.js";

const RUNTIME_IMPORT_FN = path.resolve(import.meta.dirname, "runtime-import-fn.ts");

/**
 * Resolves Storybook's stories module to our runtime `importFn` that fetches `*.stories.json`
 * files, so the prebuilt Storybook can load stories that didn't exist at build time.
 */
export function storiesPlugin(): Plugin {
  return {
    name: "chromatic:runtime-stories",
    enforce: "pre",
    resolveId: {
      order: "pre",
      handler(source) {
        if (source === VIRTUAL_STORIES_FILE) {
          return RUNTIME_IMPORT_FN;
        }
      },
    },
  };
}
