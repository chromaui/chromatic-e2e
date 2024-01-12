import { test } from '../src';

test.describe(() => {
  test.use({ delay: 1200 });

  test('Options / delay', async ({ page }) => {
    await page.goto('/options/delay');
  });
});

test.describe(() => {
  // test.use({ diffThreshold: 1 });

  test('Options / diff threshold', async ({ page }) => {
    await page.goto('/options/diff-threshold');
  });
});
