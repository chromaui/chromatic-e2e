# ADR 0001: Embed Storybook 10.x dependencies instead of using bundledDependencies

## Status

Accepted.

## Context

The packages `@chromatic-com/playwright` and `@chromatic-com/cypress` depend on Storybook 10.x (`storybook`, `@storybook/builder-webpack5`, `@storybook/server`, `@storybook/server-webpack5`) to run the archive Storybook build used for Chromatic e2e. Consumers of these packages typically have their own Storybook (e.g. 9.x) for their app.

**Problem:** With **npm** or **pnpm with node-linker=hoisted**, the consumer’s install tree ends up with **many** copies of storybook@10.x and related `@storybook/*` packages—one per nested dependency. Only **pnpm with its default (isolated) linker** naturally gives exactly two “sides”: the app’s storybook and one 10.x subtree. We want at most **two** storybook installs (the app’s + Chromatic’s) on **any** package manager and linker mode.

## Options considered

### Option A: bundledDependencies

List the Storybook 10.x packages in both `dependencies` and `bundledDependencies` so they are shipped inside the package tarball and unpacked under the package’s `node_modules` when the consumer installs.

**Pros:**

- Uses a standard npm feature; no custom build step.
- On npm (and often yarn), bundled deps are nested under the package, which can avoid polluting the root tree.

**Cons:**

- **pnpm:** With default (symlinked) `node_modules`, bundling/unpacking can break (symlinks, hard links). Subdependencies (nested `node_modules` inside bundled packages) are not bundled correctly by `pnpm pack`, so the full Storybook 10.x subtree may be incomplete. Reliable use often requires `node-linker=hoisted`, which we did not want to mandate.
- Does not meet the goal of “works on any package manager / any linker” without caveats.

### Option B: Embedded folder (chosen)

Remove the three `@storybook/*` packages from published `dependencies` and ship them as **files** in an `embedded/` directory, populated at build time by copying from the monorepo’s `node_modules` (including transitive deps, excluding `storybook`). Keep only `storybook` as a normal dependency. The Storybook config resolves framework/builder/renderer from `embedded/` via paths relative to the package root.

**Pros:**

- Works the same on **npm, pnpm (any linker), and yarn**. No PM-specific bundling behavior.
- The installer never sees the embedded packages as dependency roots, so no duplicate 10.x installs regardless of hoisting.
- Full control over what is copied (transitive deps, symlinks dereferenced); one predictable layout.

**Cons:**

- Custom script (`scripts/prepare-embedded.ts`) and build ordering (run after workspace builds so `embedded/` is not removed by package clean).
- Larger tarball due to embedded packages; Storybook 10.x version is pinned and updated deliberately.

## Decision

We use **Option B (embedded folder)** so that consumers get at most two storybook installs on any package manager and linker, without relying on `bundledDependencies` or pnpm’s hoisted mode.

## Consequences

- `@chromatic-com/playwright` and `@chromatic-com/cypress` publish an `embedded/` directory containing the Storybook 10.x stack (except the `storybook` package itself).
- Root build runs `prepare-embedded` after workspace builds; each package’s build is `prebuild && tsup` only.
- The three `@storybook/*` packages are devDependencies for the monorepo build and do not appear in the published dependencies list.
- If we ever need to support only npm/yarn and can accept pnpm limitations, revisiting `bundledDependencies` would be reasonable.

## References

- [npm package.json – bundleDependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bundleddependencies)
- [pnpm#8024 – bundledDependencies / subdependencies](https://github.com/pnpm/pnpm/issues/8024)
- Plan: embed Storybook 10 in Playwright/Cypress packages (`.cursor/plans/` or repo docs)
