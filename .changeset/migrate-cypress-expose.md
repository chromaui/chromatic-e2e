---
'@chromatic-com/cypress': minor
---

Migrate from `Cypress.env()` to `Cypress.expose()` for reading non-sensitive Chromatic config (snapshot options, `assetDomains`, `disableAutoSnapshot`). `Cypress.expose()` was introduced in Cypress 15.10.0 and replaces `Cypress.env()`, which is slated for removal in Cypress v16. This fixes runs silently breaking for projects that have migrated their own config to `Cypress.expose()`. The package now declares a `cypress` peer dependency of `>=15.10.0`.
