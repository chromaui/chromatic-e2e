# @chromaui/shared-e2e

## 0.9.4

### Patch Changes

- c16a1e2: follow redirects for 303 http response status codes

## 0.9.3

### Patch Changes

- 6fd27b1: Archive `use` tags to support SVGs

## 0.9.2

### Patch Changes

- 3d17bb6: Update Storybook Dependencies to 8.6.0

## 0.9.1

### Patch Changes

- 57ef80c: Fix to truncate filename based on byte size

## 0.9.0

### Minor Changes

- 86a0672: Picture tags are archived

## 0.8.0

### Minor Changes

- f2f800f: Support constructable stylesheets in shadow DOM elements

## 0.7.0

### Minor Changes

- 23635f7: Support using httpCredentials in Playwright global config for basic authentication

## 0.6.8

### Patch Changes

- aa60b5a: Binary path to Storybook robustly handles multiple locations

## 0.6.7

### Patch Changes

- 65e4d14: Fix ENAMETOOLONG errors by truncating snapshot and stories file names to ensure they are not too long to be written to the file system

## 0.6.6

### Patch Changes

- 13b56be: Pass Cypress archive along instead of re-bufferizing; refactored resource-archiving code slightly

## 0.6.5

### Patch Changes

- baa7427: We have one additional file that needs to be excluded for E2E target storybooks to render correctly.

## 0.6.4

### Patch Changes

- f7ca223: update storybook dependencies

## 0.6.3

### Patch Changes

- c43302c: Update for Storybook target

## 0.6.2

### Patch Changes

- 92ffd6b: Support Storybook as target for E2E tests by renaming reserved Storybook filenames to avoid collisions during archival

## 0.6.1

### Patch Changes

- f7fbfc2: Bump on the Storybook Dependencies

## 0.6.0

### Minor Changes

- 2425e3a: add support for viewports

## 0.5.1

### Patch Changes

- 657c3c0: Story names now include the file name and other containing information, instead of just the test title

## 0.1.1

### Patch Changes

- 59d2b20: remove the iframe currently used to render the snapshot

## 0.1.0

### Minor Changes

- 21b691d: depend on storybook instead of @storybook/cli
