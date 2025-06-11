---
'@chromatic-com/playwright': major
'@chromatic-com/cypress': major
'@chromatic-com/shared-e2e': major
---

BREAKING: Remove Storybook dependencies and make them peer dependencies of `@chromatic-com/playwright` and `@chromatic-com/cypress`

The release of Storybook 9 has surfaced issues with the E2E packages having their own dependency on a specific version of Storybook when they are included in a monorepo setup that also has a separate dependency on a different major version of Storybook.

This has a couple of implications for the 1.x release of the E2E integration:

- The Storybook dependency will be replaced by a peer dependency that will need to be fulfilled by the consuming project
- The peer dependency will require Storybook 9

Projects that use the E2E integration and also have a separate dependency on Storybook 8 or below should stay on version 0.x of the E2E package being used.
