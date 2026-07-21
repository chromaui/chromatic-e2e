import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { configure, takeSnapshot } from '../../src';
import Cycle from './components/cycle';

configure({ disableAutoSnapshot: true });

test('cycle test', async () => {
  document.body.appendChild(Cycle({ label: 'Hello world' }));

  await expect.element(page.getByText('< HELLO WORLD >')).toBeVisible();
  await takeSnapshot('cycle');
});
