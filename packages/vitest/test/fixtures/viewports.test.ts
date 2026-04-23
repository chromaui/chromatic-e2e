import { test } from 'vitest';
import { page } from 'vitest/browser';

test('default viewport', async () => {});

test('calls page.viewport(480, 320)', async () => {
  await page.viewport(480, 320);
});
