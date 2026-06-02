import { describe } from 'vitest';
import { test } from './utils/browser';
import { configure, takeSnapshot } from '../dist';

describe(`
Test
name
newlines
`, () => {
  test.override({ url: '/test-server-root' });

  test('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', async () => {});

  test('newlines in snapshot name', async () => {
    configure({ disableAutoSnapshot: true });

    await takeSnapshot('snapshot name\nwith newlines\r\nand carriage returns');
  });
});
