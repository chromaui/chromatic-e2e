/*
 * Playwright does not support identical test names. It throws error:
 * - `Error: duplicate test title "duplicate test names › example", first declared in duplicate-test-names.spec.ts:4`
 *
 * So let's only test duplicate snapshot names.
 */

import { takeSnapshot, test } from '../src';

test.use({ disableAutoSnapshot: true });

test('duplicate snapshot names', async ({ page }, testInfo) => {
  await page.goto('/');

  await takeSnapshot(page, 'example', testInfo);
  await takeSnapshot(page, 'example', testInfo);
});
