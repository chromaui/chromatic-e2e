/*
 * Runtime import function for Storybook stories. This file runs in the browser.
 * See Builder-Vite's original `importFn` from https://github.com/storybookjs/storybook/blob/next/code/builders/builder-vite/src/codegen-importfn-script.ts
 */

import type { ModuleExports, ModuleImportFn } from "storybook/internal/types";

interface StoriesFile {
  title: string;
  stories: ({ name: string } & Record<string, unknown>)[];
  [key: string]: unknown;
}

const RESERVED_EXPORTS = new Set(["default", "__namedExportsOrder"]);
const modules = new Map<string, Promise<ModuleExports>>();

/**
 * Replaces the build-time `importFn` of `@storybook/builder-vite`. Story files are not bundled:
 * they are fetched at runtime, relative to `iframe.html`, using the `importPath` of `index.json`.
 *
 * The `importPath` is relative to the project root, e.g. `./test-results/chromatic-archives/x.stories.json`,
 * so that it matches the story file IDs that TurboSnap reports. Story files are copied next to
 * `iframe.html`, so only the filename is used for fetching.
 */
export const importFn: ModuleImportFn = (path) => {
  let module = modules.get(path);

  if (!module) {
    module = loadStoriesFile(path);
    modules.set(path, module);

    // Allow retrying failed requests
    module.catch(() => modules.delete(path));
  }

  return module;
};

async function loadStoriesFile(path: string): Promise<ModuleExports> {
  const filename = path.slice(path.lastIndexOf("/") + 1);
  const url = new URL(`./${filename}`, document.baseURI);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to load stories file "${path}": ${response.status} ${response.statusText}`,
    );
  }

  return toCsfModule(await response.json());
}

/**
 * Converts stories file into CSF module exports, matching what `@storybook/preset-server-webpack`'s
 * loader compiled at build time.
 *
 * Story exports are keyed by story name. Story IDs come from `parameters.__id`, and the name keeps
 * Storybook's fallback ID equal to the indexer's, as both derive it via `storyNameFromExport`.
 */
export function toCsfModule(file: StoriesFile): ModuleExports {
  const { title, stories, ...meta } = file;
  const exports: ModuleExports = { default: { title, ...meta } };

  for (const story of stories) {
    const key = RESERVED_EXPORTS.has(story.name) ? `_${story.name}` : story.name;
    exports[key] = story;
  }

  return exports;
}
