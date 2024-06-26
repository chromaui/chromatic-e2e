# chromatic-playwright

## 0.6.14

### Patch Changes

- baa7427: We have one additional file that needs to be excluded for E2E target storybooks to render correctly.

## 0.6.13

### Patch Changes

- 721bc9e: Snapshots are stored in-memory to avoid overwhelming reporters

## 0.6.12

### Patch Changes

- 2550ec8: pin rrweb-snapshot version

## 0.6.11

### Patch Changes

- f7ca223: update storybook dependencies

## 0.6.10

### Patch Changes

- 93157ec: Fix EISDIR errors caused by file and directory names colliding when writing archived assets to disk

## 0.6.9

### Patch Changes

- c43302c: Update for Storybook target

## 0.6.8

### Patch Changes

- 92ffd6b: Support Storybook as target for E2E tests by renaming reserved Storybook filenames to avoid collisions during archival

## 0.6.7

### Patch Changes

- b2ef21f: Renamed the `save` function to `chromaticSnapshot` in our Playwright test fixture to avoid accidental overrides from user fixtures

## 0.6.6

### Patch Changes

- 57adc20: expose `cropToViewport` Chromatic config option

## 0.6.5

### Patch Changes

- f7fbfc2: Bump on the Storybook Dependencies

## 0.6.4

### Patch Changes

- fdca8a3: fix ESM build

## 0.6.3

### Patch Changes

- 72e0f0b: fix error handling within scripts to be less noisy

## 0.6.2

### Patch Changes

- e23f703: fix DTS build to ensure type declarations exist

## 0.6.1

### Patch Changes

- ea4e596: set default output dir correctly for each test framework, which removes the need for setting the `CHROMATIC_ARCHIVE_LOCATION` env var for Cypress

## 0.6.0

### Minor Changes

- 2425e3a: add support for viewports

## 0.5.5

### Patch Changes

- cf0911d: fix to find the html element node on snapshots without a doctype node

## 0.5.4

### Patch Changes

- 657c3c0: Story names now include the file name and other containing information, instead of just the test title

## 0.5.3

### Patch Changes

- 1303e8c: upgrade rrweb

## 0.5.2

### Patch Changes

- aa7c02a: directly depend on storybook and related packages

## 0.5.1

### Patch Changes

- ff70ca2: publish new packages

## 0.4.1

### Patch Changes

- 59c48db: fix asset mapping of link tags

## 0.4.0

### Minor Changes

- 0f7e98f: add exports for the archive storybook scripts so that they can be invoked from the CLI

## 0.3.1

### Patch Changes

- 59d2b20: remove the iframe currently used to render the snapshot

## 0.3.0

### Minor Changes

- 21b691d: depend on storybook instead of @storybook/cli

## 0.2.0

### Minor Changes

- df06cbe: - introduce `chromatic-playwright` package
  - update function and parameter names: https://github.com/chromaui/chromatic-e2e/pull/58
  - use fullscreen layout for Storybook: https://github.com/chromaui/chromatic-e2e/pull/64
