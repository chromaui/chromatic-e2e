import { test, expect } from '../src';

test('form submits succesfully', async ({ page }) => {
  test.setTimeout(2000);
  await page.goto('/forms');
  await page.locator('#form-success input[type="submit"]').click();
  await expect(page.getByText('OK!')).toBeVisible();
});
