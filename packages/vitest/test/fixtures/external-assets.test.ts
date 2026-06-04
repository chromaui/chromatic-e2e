/// <reference types="vite/client" />
import { expect, test, vi } from 'vitest';
import css from './assets/external.css?url';
import { takeSnapshot, configure } from '../../src';

configure({ disableAutoSnapshot: true });

test('external css is loaded', async () => {
  expect(getBackgroundColor()).not.toBe('rgb(255, 0, 0)');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = css;
  document.head.appendChild(link);

  await vi.waitFor(() => {
    expect(getBackgroundColor()).toBe('rgb(255, 0, 0)');
  });

  await takeSnapshot('external-css');
});

function getBackgroundColor() {
  return document.body.computedStyleMap().get('background-color').toString();
}
