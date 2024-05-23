import { test, expect } from '../src';

test.use({ assetDomains: ['localhost:6006'] });
test('visits hosted storybook page', async ({ page }) => {
  await page.goto(
    'https://main--653fef099b8957739e7534a4.chromatic.com/iframe.html?globals=viewport:w1280h720&id=options-pause-animation-at-end--snapshot-1&viewMode=story'
  );
  await expect(page.getByRole('heading', { name: /The image/i })).toBeVisible();
});
