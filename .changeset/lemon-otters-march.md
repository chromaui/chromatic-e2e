---
'@chromatic-com/playwright': patch
'@chromatic-com/cypress': patch
'@chromatic-com/shared-e2e': patch
---

Fix ENAMETOOLONG errors by truncating snapshot and stories file names to ensure they are not too long to be written to the file system
