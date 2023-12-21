import { test, expect } from '../../src';

test('Forms / form submits succesfully', async ({ page }) => {
  await page.goto('/forms');
  await page.locator('#form-success input[type="submit"]').click();
  await expect(page.getByText('OK!')).toBeVisible();
});
