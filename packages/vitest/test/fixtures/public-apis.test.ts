import { beforeEach, test } from 'vitest';
import { takeSnapshot, waitForIdleNetwork, disableAutoSnapshot } from '../../src';

beforeEach(() => {
  document.body.innerHTML = '<h1>Example heading</h1>';

  return () => {
    document.body.innerHTML = '';
  };
});

test('calls disableAutoSnapshot()', async () => {
  disableAutoSnapshot();
});

test('calls waitForIdleNetwork()', async () => {
  await waitForIdleNetwork(1);
});

test('calls takeSnapshot()', async () => {
  await takeSnapshot('manual snapshot');
});
