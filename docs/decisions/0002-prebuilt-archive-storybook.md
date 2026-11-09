# ADR 0002: Ship a prebuilt archive Storybook instead of building it in the user's project

## Status

Accepted. Supersedes [ADR 0001](./0001-embed-storybook-dependencies.md).

## Context

`build-archive-storybook` and `archive-storybook` ran `storybook build` and `storybook dev` in the user's project, using the webpack-based Storybook 10.x stack shipped in each package's `embedded/` directory ([ADR 0001](./0001-embed-storybook-dependencies.md)). `storybook` itself stayed a runtime dependency.

This kept causing problems that were hard to fix from inside the user's project:

- **Version conflicts:** users with their own Storybook got a second, pinned `storybook` install. Module resolution from Storybook's virtual entry files needed workarounds for pnpm (chromaui/chromatic-e2e#416).
- **The user's environment changes the build:** for example, webpack picked up the project's `.browserslistrc`.
- **Size:** `embedded/` contained over 8,000 files. Packages were about 9 MB packed and 42 MB unpacked.
- **Speed:** every Chromatic build compiled a Storybook with webpack.

The only per-project parts of the archive Storybook are the story list (`index.json`) and the story data (`*.stories.json`). Rendering comes from our own preview, not from story code, so nothing needs compiling per project.

## Decision

Build Storybook once, in this monorepo, and ship the static output in each package's `dist/storybook-static`.

- **`packages/archive-storybook`** (private) builds Storybook with `@storybook/builder-vite` and the `@storybook/server` renderer. It replaces builder-vite's build-time `importFn` with a runtime one that fetches `*.stories.json` and turns it into a CSF module in the browser (`src/runtime-import-fn.ts`, `src/stories-plugin.ts`). The preview and manager configs live in `.storybook/`.
- **`generateStoryIndex()`** in `@chromatic-com/shared-e2e` creates `index.json` from the `*.stories.json` files on disk. Its output is identical to what `storybook build` generates with the `@storybook/server` indexer. Story `importPath`s are relative to the project root, so they match TurboSnap's story file IDs. At runtime, only the filename is used for fetching.
- **`build-archive-storybook`** copies the prebuilt Storybook, the `*.stories.json` files and the archived snapshots and assets into the output directory. It then generates `index.json`, and copies the Vitest stats reporter's `preview-stats.json` when `--stats-json` is passed. Archives win on collisions, except `index.html` and `iframe.html`.
- **`archive-storybook`** is a small `node:http` server that serves the same files without copying them, generates `index.json` per request, and listens on `localhost` by default.
- **Both bins parse their own arguments.** They mirror the Storybook CLI flags that users and Chromatic CLI pass, and ignore everything else.
- **TurboSnap** (Vitest only): the stats reporter emits the story file modules that Chromatic CLI expects, in the shape `@storybook/builder-vite` would produce. This replaces the stats from the webpack build.
- **Story ID and tag utilities** (`toId`, `storyNameFromExport`, `combineTags`) are bundled from `storybook/internal/csf/csf-utils` (Storybook 10.6+). That entry is side-effect free. Bundling `storybook/internal/csf` instead keeps Storybook's preview addons and their `storybook/test` and `storybook/preview-api` imports, because tree-shaking can't remove them.
- **`storybook` is a devDependency** of the monorepo packages. The published packages have no Storybook dependencies.

### Options considered

- **Keep building in the user's project** (ADR 0001). Rejected for the reasons in Context.
- **Publish a Storybook framework package.** Rejected: the build recipe is only used at publish time, and a published framework would become public API.

## Consequences

- No Storybook code is installed into or runs in users' projects. Storybook version conflicts are gone.
- `build-archive-storybook` copies files instead of compiling: about 1 second instead of a webpack build.
- Each package ships its own copy of the prebuilt Storybook, about 4 MB unpacked. Storybook's manager runtime is minified after the build, since Storybook copies it without minifying, and the unused duplicates of its fonts and favicons are removed. Packages are about 1.3 MB packed and 4 MB unpacked.
- **Storybook upgrades happen in this repo.** `storybook`, `@storybook/builder-vite` and `@storybook/server` in `packages/archive-storybook`, and `storybook` in `packages/shared` and `packages/vitest`, should use the same version. Breakage shows up in this repo's CI (the smoke test and the Chromatic pipeline), never in user installs.
- Each package's tsdown config lists the packages its Node output may import (`deps.onlyImport`). The build fails if a Storybook upgrade, or any other change, makes the output import something else.

## References

- Tracking issue: chromaui/chromatic-e2e#460
