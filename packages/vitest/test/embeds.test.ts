import { expect } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';
import { takeSnapshot } from '../dist';

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
  expect(body).toContain('Embedded page');
});

test('embedded page background color can be changed', async ({ goTo }) => {
  await goTo('/embeds/embedded-page');
  expect(page.getByRole('heading', { name: 'Embedded page' })).toBeVisible();

  await page.getByRole('button', { name: 'Red' }).click();
  expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(255, 0, 0)');
  await takeSnapshot('Red background');

  await page.getByRole('button', { name: 'Yellow' }).click();
  expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(255, 255, 0)');
  await takeSnapshot('Yellow background');

  await page.getByRole('button', { name: 'Blue' }).click();
  expect(getComputedStyle(document.body).backgroundColor).toBe('rgb(0, 0, 255)');
  await takeSnapshot('Blue background');

  await page.getByRole('button', { name: 'Reset' }).click();
  expect(getComputedStyle(document.body).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  await takeSnapshot('Reset background');
});
