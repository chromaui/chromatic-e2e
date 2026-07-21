# @chromatic-com/vitest

## 0.1.7

### Patch Changes

- 663cb3d: Feat: Add TurboSnap support

## 0.1.6

### Patch Changes

- 2993acf: Fix `Module not found: Error: Can't resolve 'storybook/internal/csf'` when the archive Storybook is built in a project where `storybook` is not reachable from the project root (e.g. pnpm, regardless of the `hoist` setting). Webpack now falls back to resolving `storybook/*` imports from the `storybook` install these packages depend on.
- 0994e2e: Feat: add support for setting `colorScheme`

## 0.1.5

### Patch Changes

- a7ffb25: Fix: Prevent `storybook build` from using user's `.browserslistrc`
- 9351a7d: Fix: Prevent duplicate story names error when test name is identical in same file

## 0.1.4

### Patch Changes

- 161a994: Fix: Preserve asset extension when handling query params

## 0.1.3

### Patch Changes

- e757644: Fix: Reporter output misaligned when Vitest reports slow tests

## 0.1.2

### Patch Changes

- f95b82a: Fix: Hide unrelevant Storybook options

## 0.1.1

### Patch Changes

- 37f3b94: Fix: Browser session scoped ResourceArchiver to work-around browser caching
- ae88adc: Fix: First request's assets not archived

## 0.1.0

### Minor Changes

- b9ff93c: Fix: title auto-infer should ignore all file extensions

## 0.0.10

### Patch Changes

- 8056d0a: Feat: Add test reporter

## 0.0.9

### Patch Changes

- 235a8b1: Fix: Trim newlines from story titles
- 5a0c64d: Fix: Rework story naming logic
- d7656e7: Fix: Prevent Storybook load failure for non-ASCII story names
- 5b06595: Fix: Inherit plugin level `disableAutoSnapshot`

## 0.0.8

### Patch Changes

- dd68890: Feat: Add configure() API, remove disableAutoSnapshot()

## 0.0.7

### Patch Changes

- 6fa75b9: Fix: Public API typings

## 0.0.6

### Patch Changes

- c5a74bb: Fix: support multi browser instance setups

## 0.0.5

### Patch Changes

- 5a0b4e4: Fix: Use Storybook viewport globals (#339)

## 0.0.4

### Patch Changes

- 63b6deb: Fix: Split autosnapshot and cleanups in different test lifecycle phases

## 0.0.3

### Patch Changes

- 8b326f5: Fix: Resolve root from root config
- 8b326f5: Fix: Preserve CSS pseudo states in snapshots

## 0.0.2

### Patch Changes

- 4918001: Fix: Allow chromaticPlugin to be defined in non-browser context
- 3c5f422: Fix: Resolve viewport from when snapshot is taken
- 4d56fdd: Fix: resolve viewport from Vitest's iframe
- 95aea0a: Fix: do not remove results when 'vitest --merge-reports' is run

## 0.0.1

### Patch Changes

- 35ded1d: Add Vitest integration package
