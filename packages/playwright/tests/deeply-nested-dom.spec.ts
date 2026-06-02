import { test } from '../src';

test('pages with a deeply nested DOM are archived', async ({ page }) => {
  await page.goto('/deeply-nested-dom');
});
