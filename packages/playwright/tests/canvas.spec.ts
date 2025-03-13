import { test } from '../src';

test('captures basic canvas elements', async ({ page }) => {
  await page.goto('/canvas');
});
