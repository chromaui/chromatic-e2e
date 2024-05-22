import { test } from '../src';

test('visits the tetra storybook footer inverse page', async ({ page }) => {
  await page.goto('https://tetra.chromatic.com/iframe.html?args=&id=components-footer--inverse');
});

test('visits the tetra storybook header desktop dark page', async ({ page }) => {
  await page.goto(
    'https://tetra.chromatic.com/iframe.html?args=&id=components-header--desktop-dark'
  );
});
