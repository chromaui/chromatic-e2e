import { beforeEach, test } from 'vitest';
import { takeSnapshot, waitForIdleNetwork, configure } from '../../src';

beforeEach(() => {
  document.body.innerHTML = '<h1>Example heading</h1>';

  return () => {
    document.body.innerHTML = '';
  };
});

test('calls configure({ disableAutoSnapshot: true })', async () => {
  configure({ disableAutoSnapshot: true });
});

test('calls waitForIdleNetwork()', async () => {
  await waitForIdleNetwork(1);
});

test('calls takeSnapshot()', async () => {
  await takeSnapshot('manual snapshot');
});
