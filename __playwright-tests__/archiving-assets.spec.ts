import { test, expect } from '../src';

test('file names are shortened to a valid length for the file system', async ({ page }) => {
  await page.goto('/toolong');
});

test('file names will not collide with a directory of the same name', async ({ page }) => {
  await page.goto('/conflict');
});

test('query strings are encoded into the file name', async ({ page }) => {
  await page.goto('/assets-with-queryparams');
});
