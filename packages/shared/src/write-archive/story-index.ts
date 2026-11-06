import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { combineTags, storyNameFromExport, toId } from "storybook/internal/csf";
import type { StoryIndex, Tag } from "storybook/internal/types";

import { STORIES_FILE_EXT } from "./stories-files";

/** Tags that Storybook adds to every story by default */
const DEFAULT_TAGS: Tag[] = ["dev", "test", "manifest"];

interface StoriesFile {
  title: string;
  tags?: Tag[];
  stories: { name: string; tags?: Tag[]; parameters?: { __id?: string } }[];
}

interface Options {
  /** Directory containing the `*.stories.json` files, e.g. `<root>/test-results/chromatic-archives` */
  archivesDir: string;

  /** Project root. Story `importPath`s are relative to this, like TurboSnap's story file IDs. */
  projectRoot: string;
}

/**
 * Generates Storybook's `index.json` from the `*.stories.json` files on disk, matching what
 * `storybook build` generates with the `@storybook/server` indexer.
 *
 * @see https://github.com/storybookjs/storybook/blob/next/code/renderers/server/src/preset.ts
 * @see https://github.com/storybookjs/storybook/blob/next/code/core/src/core-server/utils/StoryIndexGenerator.ts
 */
export async function generateStoryIndex(options: Options): Promise<StoryIndex> {
  const filenames = await readdir(options.archivesDir).then((paths) =>
    paths.filter((filename) => filename.endsWith(STORIES_FILE_EXT)).sort(),
  );

  const entries: StoryIndex["entries"] = {};

  for (const filename of filenames) {
    const file = join(options.archivesDir, filename);
    const content: StoriesFile = JSON.parse(await readFile(file, "utf-8"));
    const importPath = `./${relative(options.projectRoot, file).replaceAll(sep, "/")}`;

    for (const story of content.stories) {
      const id = story.parameters?.__id ?? toId(content.title, storyNameFromExport(story.name));
      const existing = entries[id];

      if (existing) {
        throw new Error(
          `Duplicate stories with id: ${id}\n  - ${existing.importPath}\n  - ${importPath}`,
        );
      }

      entries[id] = {
        type: "story",
        subtype: "story",
        id,
        name: story.name,
        title: content.title,
        importPath,
        tags: combineTags(...DEFAULT_TAGS, ...(content.tags ?? []), ...(story.tags ?? [])),
        exportName: story.name,
      };
    }
  }

  return { v: 5, entries };
}
