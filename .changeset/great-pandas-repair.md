---
'@chromatic-com/playwright': patch
'@chromatic-com/cypress': patch
'@chromatic-com/vitest': patch
---

Fix `Module not found: Error: Can't resolve 'storybook/internal/csf'` when the archive Storybook is built in a project where `storybook` is not reachable from the project root (e.g. pnpm, regardless of the `hoist` setting). Webpack now falls back to resolving `storybook/*` imports from the `storybook` install these packages depend on.
