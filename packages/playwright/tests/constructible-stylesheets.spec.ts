import { test } from '../src';

test('styles render in plain HTML', async ({ page }) => {
  await page.goto('/constructable-stylesheets/plain');
});

test('styles render in shadow DOM elements', async ({ page }) => {
  await page.goto('/constructable-stylesheets/shadow-dom');
});

test('styles render in Web Components', async ({ page }) => {
  await page.goto('/constructable-stylesheets/web-components');
});
