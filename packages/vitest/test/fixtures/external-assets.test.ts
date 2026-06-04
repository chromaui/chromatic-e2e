/// <reference types="vite/client" />
import { expect, inject, onTestFinished, test, vi } from 'vitest';
import css from './assets/external.css?url';
import { takeSnapshot, configure } from '../../src';

configure({ disableAutoSnapshot: true });

test('external css is loaded', async () => {
  expect(getBackgroundColor()).not.toBe('rgb(255, 0, 0)');

  injectStyleTag();

  await vi.waitFor(() => {
    expect(getBackgroundColor()).toBe('rgb(255, 0, 0)');
  });

  await takeSnapshot('external-css');
});

test.runIf(inject('testName') === 'both')('external css loads from cache', async () => {
  expect(getBackgroundColor()).not.toBe('rgb(255, 0, 0)');

  injectStyleTag();

  await vi.waitFor(() => {
    expect(getBackgroundColor()).toBe('rgb(255, 0, 0)');
  });

  await takeSnapshot('external-css-cached');
});

function injectStyleTag() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = css;
  document.head.appendChild(link);

  onTestFinished(() => {
    document.head.removeChild(link);
  });
}

function getBackgroundColor() {
  return document.body.computedStyleMap().get('background-color').toString();
}
