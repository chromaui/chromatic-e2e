import { test } from 'vitest';
import { takeSnapshot } from '../../src';

test.each([1, 2, 3, 4, 5])('test #%i', async () => {
  await takeSnapshot();
});
