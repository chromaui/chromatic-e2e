import { test } from '../src';

test.describe(`
Test
name
newlines
`, () => {
  test('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', async ({ page }) => {
    await page.goto('/');
  });
});
