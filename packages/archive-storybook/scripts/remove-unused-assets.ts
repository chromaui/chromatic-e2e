/*
 * `storybook build` copies `storybook/assets/browser` twice: to the output root, and to `sb-common-assets/`.
 * Only the fonts in `sb-common-assets/` and the root `favicon.svg` are used, so remove the other copies.
 * Fails if a file to remove is referenced, e.g. after a Storybook upgrade.
 */

import { readdir, readFile, rm } from "node:fs/promises";
import { extname, join } from "node:path";

const outputDir = join(import.meta.dirname, "../dist/storybook-static");

const UNUSED_FILES = [
  "nunito-sans-bold-italic.woff2",
  "nunito-sans-bold.woff2",
  "nunito-sans-italic.woff2",
  "nunito-sans-regular.woff2",
  "favicon-wrapper.svg",
  "sb-common-assets/favicon.svg",
  "sb-common-assets/favicon-wrapper.svg",
];

const sources = await readSources(outputDir);

// Check all files before removing any
for (const file of UNUSED_FILES) {
  // Root files are referenced as e.g. `./favicon.svg`, others with their directory
  const reference = file.includes("/") ? file : `./${file}`;
  const referencedBy = sources.filter((source) => source.content.includes(reference));

  if (referencedBy.length > 0) {
    throw new Error(
      `Can't remove ${file}, it's referenced by: ${referencedBy.map((s) => s.file).join(", ")}`,
    );
  }
}

for (const file of UNUSED_FILES) {
  await rm(join(outputDir, file), { force: true });
}

console.log(`Removed ${UNUSED_FILES.length} unused assets`);

async function readSources(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && [".html", ".js", ".css"].includes(extname(entry.name)))
    .map((entry) => join(entry.parentPath, entry.name));

  return Promise.all(
    files.map(async (file) => ({
      file: file.slice(directory.length + 1),
      content: await readFile(file, "utf8"),
    })),
  );
}
