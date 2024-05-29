import { test, expect, takeSnapshot } from '../src';

test('multiple snapshots are taken', async ({ page }, testInfo) => {
  await page.goto('/manual-snapshots');
  await takeSnapshot(page, 'accordion collapsed', testInfo);
  await page.locator('summary').click();
  await expect(page.getByText('I am hiding inside!')).toBeVisible();
});

test.describe('', () => {
  test.use({ disableAutoSnapshot: true });
  test('manual snapshot is taken even when automatic snapshots are turned off', async ({
    page,
  }, testInfo) => {
    await page.goto('/manual-snapshots');
    await takeSnapshot(page, 'accordion collapsed', testInfo);
    await page.locator('summary').click();
    await expect(page.getByText('I am hiding inside!')).toBeVisible();
  });
});
