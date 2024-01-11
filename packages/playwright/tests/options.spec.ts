import { test } from '../src';

test.describe(() => {
  test('Options / delay', async ({ page }) => {
    await page.goto('/options/delay');
  });
});
