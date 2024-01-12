import { test } from '../src';

test.describe(() => {
  test.use({ delay: 1200 });

  test('Options / delay', async ({ page }) => {
    await page.goto('/options/delay');
  });
});

test.describe(() => {
  test.use({ diffThreshold: 1 });

  test('Options / diff threshold', async ({ page }) => {
    await page.goto('/options/diff-threshold');
  });
});

test.describe(() => {
  // test.use({ pauseAnimationAtEnd: true });

  test('Options / pause animation at end', async ({ page }) => {
    await page.goto('/options/pause-animation-at-end');
  });
});

test.describe(() => {
  // test.use({ forcedColors: true });

  test('Options / force high-contrast', async ({ page }) => {
    await page.goto('/options/forced-colors');
  });
});
