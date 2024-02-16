import { test } from '../src';

test('snapshots capture the correct viewport size', async ({ page }) => {
  await page.goto('/viewports');
});

test.describe('hardcoded viewport', () => {
  test.use({ viewport: { width: 800, height: 720 } });

  test('does not display the large or small viewport copy', async ({ page }) => {
    await page.goto('/viewports');
  });
});
