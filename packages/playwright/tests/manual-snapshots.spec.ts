import { test, expect, takeSnapshot } from '../src';

test('Manual snapshots / multiple snapshots are taken', async ({ page }, testInfo) => {
  await page.goto('/manual-snapshots');
  await takeSnapshot(page, 'accordion collapsed', testInfo);
  await page.locator('summary').click();
  await expect(page.getByText('I am hiding inside!')).toBeVisible();
});
