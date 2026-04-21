import { test } from 'vitest';
import { page } from 'vitest/browser';
import { takeSnapshot } from '../../src';

test('default viewport', async () => {});

test('calls page.viewport(480, 320)', async () => {
  await page.viewport(480, 320);
});

test('calls page.viewport multiple times in one test', async () => {
  await page.viewport(480, 320);
  await takeSnapshot('480 x 320');

  await page.viewport(720, 680);
  await takeSnapshot('720 x 680');

  await page.viewport(1280, 1024);
  await takeSnapshot('1280 x 1024');
});
