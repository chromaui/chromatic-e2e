---
'@chromatic-com/playwright': patch
'@chromatic-com/cypress': patch
---

- Use the configured `downloadsFolder` in Cypress as the output dir for archives
- Move Playwright-related path logic out of the shared package into the Playwright package
