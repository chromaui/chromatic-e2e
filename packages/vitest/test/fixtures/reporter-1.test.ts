import { inject, test } from 'vitest';
import { takeSnapshot } from '../../src';

const delay = inject('delay');

test.each([1, 2, 3])('test #%i', async (index) => {
  if (delay && index > 2) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  await takeSnapshot();
});
