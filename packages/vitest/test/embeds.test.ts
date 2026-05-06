import { expect, vi } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';
import { takeSnapshot, disableAutoSnapshot } from '../dist';

function embeddedDocument(): Document {
  const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Same-origin iframe"]');
  const doc = iframe?.contentDocument;
  if (!doc) {
    throw new Error('Expected same-origin iframe with a loaded document');
  }
  return doc;
}

function clickEmbeddedButton(label: string): void {
  const doc = embeddedDocument();
  const button = Array.from(doc.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === label
  );
  if (!button) {
    throw new Error(`Button "${label}" not found in embedded document`);
  }
  button.click();
}

test('same-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/same-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  expect(page.getByTitle('Same-origin iframe')).toBeVisible();
});

test('cross-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/cross-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  expect(page.getByTitle('Cross-origin iframe')).toBeVisible();
  const res = await fetch('/embed-server-root/');
  expect(res.ok).toBe(true);
  const body = await res.text();
  expect(body).toContain('Embedded page');
});

test('embedded page background color can be changed', async ({ goTo }) => {
  disableAutoSnapshot();

  await goTo('/embeds/same-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();

  await vi.waitUntil(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[title="Same-origin iframe"]');
    const h1 = iframe?.contentDocument?.querySelector('h1');
    return h1?.textContent?.includes('Embedded page') === true;
  });

  const embeddedBody = () => embeddedDocument().body;

  clickEmbeddedButton('Red');
  expect(getComputedStyle(embeddedBody()).backgroundColor).toBe('rgb(255, 0, 0)');
  await takeSnapshot('Red background');

  clickEmbeddedButton('Yellow');
  expect(getComputedStyle(embeddedBody()).backgroundColor).toBe('rgb(255, 255, 0)');
  await takeSnapshot('Yellow background');

  clickEmbeddedButton('Blue');
  expect(getComputedStyle(embeddedBody()).backgroundColor).toBe('rgb(0, 0, 255)');
  await takeSnapshot('Blue background');

  clickEmbeddedButton('Reset');
  expect(getComputedStyle(embeddedBody()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  await takeSnapshot('Reset background');
});
