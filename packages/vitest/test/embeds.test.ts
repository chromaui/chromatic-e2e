import { expect } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';

test('same-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/same-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  expect(page.getByTitle('Same-origin iframe')).toBeVisible();
});

test('cross-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/cross-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  expect(page.getByTitle('Cross-origin iframe')).toBeVisible();
  const res = await fetch('/embed-server-root/');
  expect(res.ok).toBe(true);
  const body = await res.text();
  expect(body).toContain('Testing testing just a basic page');
});
