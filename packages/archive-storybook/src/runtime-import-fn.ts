/*
 * Runtime import function for Storybook stories. This file runs in the browser.
 * See Builder-Vite's original `importFn` from https://github.com/storybookjs/storybook/blob/next/code/builders/builder-vite/src/codegen-importfn-script.ts
 */

import type { ModuleExports, ImportModule } from "storybook/internal/types";

interface StoriesFile {
  title: string;
  stories: ({ name: string } & Record<string, unknown>)[];
  [key: string]: unknown;
}

const RESERVED_EXPORTS = new Set(["default", "__namedExportsOrder"]);
const modules = new Map<string, Promise<ModuleExports>>();

// Story files are next to `iframe.html`. Capture its URL before rendering, as rendered snapshots
// replace the document, including any `<base href>`.
const STORIES_BASE_URL = document.baseURI;

/**
 * TODO rewrite
 */
export const importModule: ImportModule = (importPath, original) => {
  if (!importPath.endsWith(".stories.json")) {
    return original(importPath);
  }

  let module = modules.get(importPath);

  if (!module) {
    module = loadStoriesFile(importPath);
    modules.set(importPath, module);

    // Allow retrying failed requests
    module.catch(() => modules.delete(importPath));
  }

  return module;
};

async function loadStoriesFile(path: string): Promise<ModuleExports> {
  const filename = path.slice(path.lastIndexOf("/") + 1);
  const url = new URL(`./${filename}`, STORIES_BASE_URL);
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
