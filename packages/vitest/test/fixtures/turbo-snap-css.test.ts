import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { configure, takeSnapshot } from '../../src';
import Styled from './components/styled';

configure({ disableAutoSnapshot: true });

test('css test', async () => {
  document.body.appendChild(Styled({ label: 'Hello world' }));

  await expect.element(page.getByText('Hello world')).toBeVisible();
  await takeSnapshot('css');
});
