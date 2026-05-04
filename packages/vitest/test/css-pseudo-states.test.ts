import { assert, expect } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { test } from './utils/browser';
import { disableAutoSnapshot, takeSnapshot } from '../dist';

disableAutoSnapshot();

test.override({ url: '/css-pseudo-states' });

test('captures :hover state', async () => {
  await page.getByRole('button', { name: 'target' }).hover();

  const hovered = document.querySelector('button:hover');
  assert(hovered, 'Expected the button to be hovered');

  expect(page.elementLocator(hovered)).toBeVisible();

  await takeSnapshot('hover');
});

test('captures :focus state', async () => {
  await page.getByRole('button', { name: 'target' }).click();

  const focused = document.querySelector('button:focus');
  assert(focused, 'Expected the button to be focused');

  expect(page.elementLocator(focused)).toBeVisible();

  await takeSnapshot('focus');
});

test('captures :focus-visible state', async () => {
  await page.getByRole('button', { name: 'Focus this before tab' }).click();
  await userEvent.tab();

  const focused = document.querySelector('button:focus-visible');
  assert(focused, 'Expected the button to be focused');

  expect(page.elementLocator(focused)).toBeVisible();

  await takeSnapshot('focus-visible');
});

test('captures :active state', async () => {
  await (commands as any).mousedown('button#target');

  const active = document.querySelector('button:active');
  assert(active, 'Expected the button to be active');

  expect(page.elementLocator(active)).toBeVisible();

  await takeSnapshot('active');
});
