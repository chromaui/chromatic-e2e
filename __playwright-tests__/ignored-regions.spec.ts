import { test, expect } from '../src';

// NOTE: This is a test that is meant to be run through Chromatic, so it doesn't actually work
//       with the automated test suite.
test('ignored regions work with chromatic', async ({ page }) => {
  test.setTimeout(2000);
  await page.goto('/ignore');
  await setTimeout(() => {}, 1000);
});
