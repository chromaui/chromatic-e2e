import { test } from '../src';

test('Scrolling / scrolls', async ({ page }) => {
  await page.goto('/scrolling');

  const title = page.getByTestId('scroll-to');
  await title.scrollIntoViewIfNeeded();
});
