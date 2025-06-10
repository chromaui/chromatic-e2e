import { test, takeSnapshot } from '../src';

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

test.describe(() => {
  test.use({ cropToViewport: true });

  test('crops to viewport', async ({ page }) => {
    await page.goto('/options/crop-to-viewport');
  });
});

test('does not crop to viewport by default', async ({ page }) => {
  await page.goto('/options/crop-to-viewport');
});

test.describe(() => {
  test.use({ groupByProject: true });

  test('groups test by project', async ({ page }, testInfo) => {
    await page.goto('/options/group-by-project');

    if (testInfo.project.name === 'Desktop') {
      takeSnapshot(page, 'Extra Desktop Snapshot', testInfo);
    }
  });
});
