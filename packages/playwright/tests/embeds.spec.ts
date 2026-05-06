import { test, expect, takeSnapshot } from '../src';

test('same-origin embed page loads', async ({ page }) => {
  await page.goto('/embeds/same-origin');
  await expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  await expect(page.locator('iframe[title="Same-origin iframe"]')).toBeVisible();
});

test('cross-origin embed page loads', async ({ page }) => {
  await page.goto('/embeds/cross-origin');
  await expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  await expect(page.locator('iframe[title="Cross-origin iframe"]')).toBeVisible();
  await expect(
    page.frameLocator('iframe[title="Cross-origin iframe"]').getByText('Embedded page')
  ).toBeVisible();
});

test('embedded page background color can be changed', async ({ page }, testInfo) => {
  await page.goto('/embeds/embedded-page');
  await expect(page.getByRole('heading', { name: 'Embedded page' })).toBeVisible();

  await page.getByRole('button', { name: 'Red' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
  await takeSnapshot(page, 'Red background', testInfo);

  await page.getByRole('button', { name: 'Yellow' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 0)');
  await takeSnapshot(page, 'Yellow background', testInfo);

  await page.getByRole('button', { name: 'Blue' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 255)');
  await takeSnapshot(page, 'Blue background', testInfo);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await takeSnapshot(page, 'Reset background', testInfo);
});
