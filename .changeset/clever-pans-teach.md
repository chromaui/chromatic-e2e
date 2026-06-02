---
'@chromatic-com/playwright': patch
---

Fix archived responsive image replay by stripping stale `img.srcset` and `img.sizes` after the captured image asset has been resolved.
