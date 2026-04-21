import { expect, takeSnapshot, test } from '../src';

test('snapshots capture the correct viewport size', async ({ page }) => {
  await page.goto('/viewports');
});

test.describe('hardcoded viewport', () => {
  test.use({ viewport: { width: 800, height: 720 } });

  test('snapshots capture the correct viewport size', async ({ page }) => {
    await page.goto('/viewports');
  });

  test('snapshots capture multiple viewports inside a single test case', async ({
    page,
  }, testInfo) => {
    await page.goto('/viewports');
    await expect(page.getByText("I'm always rendered")).toBeVisible();
    await takeSnapshot(page, 'default', testInfo);

    await page.setViewportSize({ width: 480, height: 320 });
    await expect(page.getByText('Window width: 480')).toBeVisible();
    await expect(page.getByText("I'm rendered when the page width is between 500-0")).toBeVisible();
    await takeSnapshot(page, '480 x 320', testInfo);

    await page.setViewportSize({ width: 850, height: 500 });
    await expect(page.getByText('Window width: 850')).toBeVisible();
    await expect(
      page.getByText("I'm rendered when the page width is between 900-800")
    ).toBeVisible();
    await takeSnapshot(page, '850 x 500', testInfo);

    await page.setViewportSize({ width: 1050, height: 1080 });
    await expect(page.getByText('Window width: 1050')).toBeVisible();
    await expect(
      page.getByText("I'm rendered when the page width is between 1100-1000")
    ).toBeVisible();
    await takeSnapshot(page, '1050 x 1080', testInfo);
  });
});
