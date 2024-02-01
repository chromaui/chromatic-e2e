import { test } from '../src';

test.describe(() => {
  test.use({ delay: 2500 });

  test('delay', async ({ page }) => {
    await page.goto('/options/delay');
  });
});

test.describe(() => {
  test.use({ diffThreshold: 1 });

  test('diff threshold', async ({ page }) => {
    await page.goto('/options/diff-threshold');
  });
});

test.describe(() => {
  test.use({ pauseAnimationAtEnd: true });

  test('pause animation at end', async ({ page }) => {
    await page.goto('/options/pause-animation-at-end');
  });
});

test.describe(() => {
  test.use({ forcedColors: 'active' });

  test('force high-contrast', async ({ page }) => {
    await page.goto('/options/forced-colors');
  });
});

test.describe(() => {
  test.use({ prefersReducedMotion: 'reduce' });

  test('prefers reduced motion', async ({ page }) => {
    await page.goto('/options/prefers-reduced-motion');
  });
});
