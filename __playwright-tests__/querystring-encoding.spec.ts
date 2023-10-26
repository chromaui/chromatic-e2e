import { test } from '../src';

test('query strings are encoded into the asset file name', async ({ page }) => {
  await page.goto('/assets-with-queryparams');
});
