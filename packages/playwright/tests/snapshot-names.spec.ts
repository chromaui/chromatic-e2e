import { test, takeSnapshot } from '../src';

test.describe('', () => {
  test.use({ disableAutoSnapshot: true });

  test('in snapshot name', async ({ page }, testInfo) => {
    await page.goto('/');

    await takeSnapshot(page, 'あ', testInfo);
  });

  test('in test case name あ', async ({ page }, testInfo) => {
    await page.goto('/');

    await takeSnapshot(page, testInfo);
  });
});
