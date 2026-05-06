import { test, expect } from '../src';

test('same-origin embed page loads', async ({ page }) => {
  await page.goto('/embeds/same-origin');
  await expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  await expect(page.locator('iframe[title="Same-origin iframe"]')).toBeVisible();
});
