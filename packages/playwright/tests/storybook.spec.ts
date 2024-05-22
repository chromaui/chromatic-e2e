import { test, expect } from '../src';

test.use({ assetDomains: ['localhost:6006'] });
test('visits the test storybook page logged in', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?args=&id=example-page--logged-in&viewMode=story'
  );
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});

test('visits the test storybook page logged out', async ({ page }) => {
  await page.goto(
    'http://localhost:6006/iframe.html?args=&id=example-page--logged-out&viewMode=story'
  );
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});
