import { expect } from 'vitest';
import { Locator, locators, page } from 'vitest/browser';
import { test } from './utils/browser';
import { takeSnapshot, disableAutoSnapshot } from '../dist';

test('same-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/same-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();

  await expect
    .element(
      page
        .frameLocator(page.getByTitle('Same-origin iframe'))
        .getByRole('heading', { level: 1, name: 'Embedded page' })
    )
    .toBeVisible();
});

test('cross-origin embed page loads', async ({ goTo }) => {
  await goTo('/embeds/cross-origin');

  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();
  expect(page.getByTitle('Cross-origin iframe')).toBeVisible();

  // As we don't use --disable-web-security, we cannot query the cross-origin iframes contents.
  // Verify that their content is expected with separate fetch.
  const res = await fetch('/embed-server-root/');
  await expect(res.text()).resolves.toContain('Embedded page');
});

test('embedded page background color can be changed', async ({ goTo }) => {
  disableAutoSnapshot();

  await goTo('/embeds/same-origin');
  expect(page.getByRole('heading', { name: 'Embeds' })).toBeVisible();

  const frame = page.frameLocator(page.getByTitle('Same-origin iframe'));

  await expect
    .element(frame.getByRole('heading', { level: 1, name: 'Embedded page' }))
    .toBeVisible();

  await frame.getByRole('button', { name: 'Red' }).click();

  expect(frame.getBodyCSS()).toEqual({ 'background-color': 'rgb(255, 0, 0)' });
  await takeSnapshot('Red background');

  await frame.getByRole('button', { name: 'Yellow' }).click();
  expect(frame.getBodyCSS()).toEqual({ 'background-color': 'rgb(255, 255, 0)' });
  await takeSnapshot('Yellow background');

  await frame.getByRole('button', { name: 'Blue' }).click();
  expect(frame.getBodyCSS()).toEqual({ 'background-color': 'rgb(0, 0, 255)' });
  await takeSnapshot('Blue background');

  await frame.getByRole('button', { name: 'Reset' }).click();
  expect(frame.getBodyCSS()).toEqual({ 'background-color': 'rgba(0, 0, 0, 0)' });
  await takeSnapshot('Reset background');
});

locators.extend({
  __getBody: () => 'body',
  getBodyCSS() {
    return {
      // Pick just background-color for now
      'background-color': this.__getBody()
        .element()
        .computedStyleMap()
        .get('background-color')
        .toString(),
    };
  },
});

declare module 'vitest/browser' {
  interface LocatorSelectors {
    getBodyCSS(): { 'background-color': string };
    __getBody(): Locator;
  }
}
