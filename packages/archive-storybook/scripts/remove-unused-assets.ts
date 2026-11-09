/*
 * `storybook build` copies `storybook/assets/browser` twice: to the output root, and to `sb-common-assets/`.
 * Only the fonts in `sb-common-assets/` and the root `favicon.svg` are used, so remove the other copies.
 * Fails if a file to remove is missing or referenced, e.g. after a Storybook upgrade.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, rm, stat } from "node:fs/promises";
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
  if (!existsSync(join(outputDir, file))) {
    throw new Error(
      `Can't remove ${file}, it was not found in ${outputDir}. Maybe updated Storybook no longer generates it?`,
    );
  }

  // Catches any reference to the file, e.g. `nunito-sans-bold.woff2`, `./nunito-sans-bold.woff2` or `/nunito-sans-bold.woff2`.
  // References to the `sb-common-assets/` copies are ignored, as those are kept.
  const referencedBy = sources.filter((source) =>
    source.content.replaceAll(`sb-common-assets/${file}`, "").includes(file),
  );

  if (referencedBy.length > 0) {
    throw new Error(
      `Can't remove ${file}, it's referenced by: ${referencedBy.map((s) => s.file).join(", ")}`,
    );
  }
}

let removedBytes = 0;

for (const file of UNUSED_FILES) {
  removedBytes += (await stat(join(outputDir, file))).size;
  await rm(join(outputDir, file), { force: true });
}

console.log(`Removed ${UNUSED_FILES.length} unused assets (${Math.round(removedBytes / 1024)} kB)`);

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
