import { test } from '../src';

test.describe(() => {
  test.use({ delay: 1200 });

  test('Options / delay', async ({ page }) => {
    await page.goto('/options/delay');
  });
});
