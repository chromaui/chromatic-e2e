import { expect, test } from 'vitest';
import { page } from 'vitest/browser';
import { configure, takeSnapshot } from '../../src';
import Accordion from './components/accordion';

configure({ disableAutoSnapshot: true });

test('accordion test', async () => {
  document.body.appendChild(Accordion({ content: 'Hello world' }));

  const content = page.getByText('Hello world');
  const toggle = page.getByRole('button', { name: 'Open' });

  await expect.element(content).not.toBeVisible();
  await takeSnapshot('closed');

  await toggle.click();
  await expect.element(content).toBeVisible();
  await takeSnapshot('open');
});
