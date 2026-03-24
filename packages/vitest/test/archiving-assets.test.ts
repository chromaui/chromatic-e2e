import { test } from './utils/browser';

test('query params determine which asset is served', async ({ goTo }) => {
  await goTo('/asset-paths/query-params');
});

test('asset doesnt prevent directory from being created', async ({ goTo }) => {
  await goTo('/asset-paths/asset-at-directory-name');
});

test('asset is found at relative path', async ({ goTo, skip }) => {
  const note = 'Vitest serves files at root so testing relative paths makes no sense';
  document.body.innerHTML = note;
  skip(note);

  await goTo('/asset-paths/relative-path');
});

test('long file names are allowed', async ({ goTo }) => {
  await goTo('/asset-paths/long-file-name');
});

test('external asset is not archived (but still renders)', async ({ goTo }) => {
  await goTo('/asset-paths/external-asset-not-archived');
});

test('external asset is archived', async ({ skip }) => {
  document.body.innerHTML = 'TODO: Set up page.route mocking on server side';
  skip('TODO: Set up page.route mocking on server side');
});

test('assets from css urls are archived', async ({ goTo }) => {
  await goTo('/asset-paths/css-urls');
});

test('assets from data urls are archived', async ({ goTo }) => {
  await goTo('/asset-paths/data-urls');
});

test('percents in URLs are handled', async ({ goTo }) => {
  await goTo('/asset-paths/percents');
});

test('colons in URLs are handled', async ({ goTo }) => {
  await goTo('/asset-paths/colons');
});

test('srcset is used to determine image asset URL', async ({ goTo }) => {
  await goTo('/asset-paths/srcset');
});

test('picture source is captured, multiple source elements', async ({ goTo }) => {
  await goTo('/asset-paths/picture');
});

test('picture source is captured, single source with srcset', async ({ goTo }) => {
  await goTo('/asset-paths/picture-multiple-srcset');
});

test('picture captures fallback image', async ({ goTo }) => {
  await goTo('/asset-paths/picture-no-matching-source');
});

test('external CSS files are inlined', async ({ goTo }) => {
  await goTo('/asset-paths/external-css-files');
});

test('video poster image is rendered', async ({ goTo }) => {
  await goTo('/asset-paths/video-poster');
});

test('link tags for fonts preloads and other things are handled', async ({ goTo }) => {
  await goTo('/asset-paths/link-tags');
});

test('use tags for sprites are archived', async ({ goTo }) => {
  await goTo('/asset-paths/sprites');
});

test('assets from relative css urls with base tag are archived', async ({ goTo, skip }) => {
  const note = 'Vitest serves files at root so testing relative paths makes no sense';
  document.body.innerHTML = note;
  skip(note);

  await goTo('/asset-paths/relative-urls-with-base');
});
