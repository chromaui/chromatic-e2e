import { test, expect } from '../src';

test.describe(() => {
  test('can login', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByText('I AM PROTECTED!!!')).toBeVisible();
  });
});
