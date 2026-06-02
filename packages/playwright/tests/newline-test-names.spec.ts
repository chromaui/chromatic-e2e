import { takeSnapshot, test } from '../src';

test.describe(`
Test
name
newlines
`, () => {
  test.use({ disableAutoSnapshot: true });

  test('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', async ({ page }, testInfo) => {
    await page.goto('/');
    await takeSnapshot(page, testInfo);
  });

  test('newlines in snapshot name', async ({ page }, testInfo) => {
    await page.goto('/');
    await takeSnapshot(page, 'snapshot name\nwith newlines\r\nand carriage returns', testInfo);
  });
});
