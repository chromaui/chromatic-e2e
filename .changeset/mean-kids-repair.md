---
'@chromatic-com/playwright': patch
'@chromatic-com/cypress': patch
---

set default output dir correctly for each test framework, which removes the need for setting the `CHROMATIC_ARCHIVE_LOCATION` env var for Cypress
