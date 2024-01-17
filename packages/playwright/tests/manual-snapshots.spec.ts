import { test } from '../src';

test('Manual snapshots / multiple snapshots are taken', async ({ page }) => {
  await page.goto('/manual-snapshots');
  await page.locator('summary').click();
  await expect(page.getByText('I am hiding inside!')).toBeVisible();
});
