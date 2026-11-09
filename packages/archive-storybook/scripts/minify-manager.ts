/*
 * Storybook copies its manager runtime into `sb-manager/` as is, without minifying it.
 * Manager addons in `sb-addons/` are only partially minified.
 * Minify both after `storybook build`, as they're the largest part of the prebuilt Storybook.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { minifySync } from "vite";

const outputDir = join(import.meta.dirname, "../dist/storybook-static");
const directories = ["sb-manager", "sb-addons"];

let before = 0;
let after = 0;

for (const directory of directories) {
  const entries = await readdir(join(outputDir, directory), {
    recursive: true,
    withFileTypes: true,
  });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

    const file = join(entry.parentPath, entry.name);
    const source = await readFile(file, "utf8");

    // Files are loaded with `<script type="module">` and `import`
    const result = minifySync(entry.name, source, { module: true });

    if (result.errors.length > 0) {
      throw new Error(
        `Failed to minify ${file}:\n${result.errors.map((e) => e.message).join("\n")}`,
      );
    }

    await writeFile(file, result.code);

    before += source.length;
    after += result.code.length;
  }
}

console.log(`Minified ${directories.join(", ")}: ${kB(before)} -> ${kB(after)}`);

function kB(bytes: number) {
  return `${Math.round(bytes / 1024)} kB`;
}
