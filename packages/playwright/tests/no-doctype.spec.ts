import { test } from '../src';

test('pages without a doctype are archived', async ({ page }) => {
  await page.goto('/no-doctype');
});
