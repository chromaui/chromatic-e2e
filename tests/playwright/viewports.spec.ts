import { test, expect, takeArchive } from '../../src';

test('Viewports / TBD', async ({ page }, testInfo) => {
  await page.goto('/viewports');
  await takeArchive(page, testInfo);
});
