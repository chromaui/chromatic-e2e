import { test, expect } from '../src';

test('asset paths', async ({ page }) => {
  await page.goto('/asset-paths');
});
