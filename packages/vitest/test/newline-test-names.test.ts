import { describe } from 'vitest';
import { test } from './utils/browser';

describe(`
Test
name
newlines
`, () => {
  test.override({ url: '/test-server-root' });

  test('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', async () => {});
});
