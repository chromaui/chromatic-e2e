import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { configure, takeSnapshot } from '../../src';
import Button from './components/button';

configure({ disableAutoSnapshot: true });

test('button test', async () => {
  document.body.appendChild(Button({ label: 'Submit' }));

  await expect.element(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await takeSnapshot('default');
});
