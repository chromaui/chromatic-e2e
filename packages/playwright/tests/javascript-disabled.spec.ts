import { takeSnapshot, test } from '../src';

test.describe('', () => {
  test.use({ javaScriptEnabled: false, disableAutoSnapshot: true });

  test('visiting page while JavaScript disabled', async ({ page }, testInfo) => {
    await page.goto('/');

    await takeSnapshot(page, testInfo);
  });
});
