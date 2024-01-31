# chromatic-cypress

## 0.4.1

### Patch Changes

- 59c48db: fix asset mapping of link tags

## 0.4.0

### Minor Changes

- 0f7e98f: add exports for the archive storybook scripts so that they can be invoked from the CLI

## 0.3.3

### Patch Changes

- 0e4f2c1: Cypress users must pass `config` to `installPlugin` so we can detect if they are running tests in CI or interactive mode.

## 0.3.2

### Patch Changes

- 4b408a7: Support file included in dist

## 0.3.1

### Patch Changes

- 59d2b20: remove the iframe currently used to render the snapshot

## 0.3.0

### Minor Changes

- 21b691d: depend on storybook instead of @storybook/cli

## 0.2.0

### Minor Changes

- 0070406: - introduce `chromatic-cypress` package
  - add Chromatic options for Cypress: https://github.com/chromaui/chromatic-e2e/pull/59
  - use fullscreen layout for Storybook: https://github.com/chromaui/chromatic-e2e/pull/64
