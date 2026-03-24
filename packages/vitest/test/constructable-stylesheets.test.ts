import { test } from './utils/browser';

test('styles render in plain HTML', async ({ goTo }) => {
  await goTo('/constructable-stylesheets/plain');
});

test('styles render in shadow DOM elements', async ({ goTo }) => {
  await goTo('/constructable-stylesheets/shadow-dom');
});

test('styles render in Web Components', async ({ goTo }) => {
  await goTo('/constructable-stylesheets/web-components');
});

test('styles render in web components in shadow DOM', async ({ goTo }) => {
  await goTo('/constructable-stylesheets/web-components-shadow-dom');
});
