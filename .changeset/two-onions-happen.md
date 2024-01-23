---
'chromatic-cypress': patch
---

Cypress users must pass `config` to `installPlugin` so we can detect if they are running tests in CI or interactive mode.
