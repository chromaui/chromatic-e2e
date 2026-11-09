/*
 * Storybook copies its manager runtime into `sb-manager/` as is, without minifying it.
 * Minify it after `storybook build`, as it's the largest part of the prebuilt Storybook.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { minify } from "vite";

const managerDir = join(import.meta.dirname, "../dist/storybook-static/sb-manager");

let before = 0;
let after = 0;

for (const filename of await readdir(managerDir)) {
  if (!filename.endsWith(".js")) continue;

  const file = join(managerDir, filename);
  const source = await readFile(file, "utf8");

  // Files are loaded with `<script type="module">` and `import`
  const result = await minify(filename, source, { module: true });

  if (result.errors.length > 0) {
    throw new Error(`Failed to minify ${file}:\n${result.errors.map((e) => e.message).join("\n")}`);
  }

  await writeFile(file, result.code);

  before += source.length;
  after += result.code.length;
}

console.log(`Minified sb-manager: ${kB(before)} -> ${kB(after)}`);

function kB(bytes: number) {
  return `${Math.round(bytes / 1024)} kB`;
}
