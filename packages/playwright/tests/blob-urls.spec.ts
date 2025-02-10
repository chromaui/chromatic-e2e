import * as path from 'path';
import { test, expect, takeSnapshot } from '../src';

test.use({ ignoreSelectors: ['#objectUrl'] });

test('Upload a Single file and Assert blob', async ({ page }) => {
  await page.goto('/blob-urls');
  const fileWithPath = path.join(__dirname, '../../../test-server/fixtures/blue.png');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#fileInput').click(),
  ]);
  await fileChooser.setFiles([fileWithPath]);
  await page.locator('#fileInput').dispatchEvent('change');
  await expect(page.locator('#objectUrl')).toHaveText(/blob:.*/);
});

test('Captures blob contents for manual snapshots', async ({ page }, testInfo) => {
  await page.goto('/blob-urls');
  const fileWithPath = path.join(__dirname, '../../../test-server/fixtures/blue.png');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#fileInput').click(),
  ]);
  await fileChooser.setFiles([fileWithPath]);
  await page.locator('#fileInput').dispatchEvent('change');
  await expect(page.locator('#objectUrl')).toHaveText(/blob:.*/);
  await takeSnapshot(page, 'Manual snapshot (Should show a blue square)', testInfo);

  await page.goto('/asset-paths/query-params');
});

// adapted from https://fossies.org/linux/playwright/tests/library/trace-viewer.spec.ts
test('Fetch data for blob', async ({ page }) => {
  await page.goto('/blob-urls?noUpload=true');
  const size = await page.locator('#blobImg').evaluate((e) => (e as HTMLImageElement).naturalWidth);
  expect(size).toBe(10);
});
