import { test, expect } from '../src';

test('pages with AMD modules are archived', async ({ page }) => {
  await page.goto('/amd');
  await expect(page.getByText('Sum of')).toBeVisible();
});
