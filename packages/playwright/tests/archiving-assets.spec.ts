import fs from 'fs/promises';
import path from 'path';
import { test } from '../src';

// domain of external image in test (to archive)
test.use({ assetDomains: ['some.external'] });

test('query params determine which asset is served', async ({ page }) => {
  await page.goto('/asset-paths/query-params');
});

test('asset doesnt prevent directory from being created', async ({ page }) => {
  await page.goto('/asset-paths/asset-at-directory-name');
});

test('asset is found at relative path', async ({ page }) => {
  await page.goto('/asset-paths/relative-path');
});

test('long file names are allowed', async ({ page }) => {
  await page.goto('/asset-paths/long-file-name');
});

test('external asset is not archived (but still renders)', async ({ page }) => {
  await page.goto('/asset-paths/external-asset-not-archived');
});

test('external asset is archived', async ({ page }) => {
  // mock the external image (which we'll archive)
  await page.route('https://some.external/domain/image.png', async (route) => {
    const file = await fs.readFile(path.join(__dirname, '../../../test-server/fixtures/pink.png'), {
      encoding: 'base64',
    });
    await route.fulfill({ body: Buffer.from(file, 'base64') });
  });

  await page.goto('/asset-paths/external-asset-archived');
});

test('assets from css urls are archived', async ({ page }) => {
  await page.goto('/asset-paths/css-urls');
});

test('assets from data urls are archived', async ({ page }) => {
  await page.goto('/asset-paths/data-urls');
});

test('percents in URLs are handled', async ({ page }) => {
  await page.goto('/asset-paths/percents');
});

test('srcset is used to determine image asset URL', async ({ page }) => {
  await page.goto('/asset-paths/srcset');
});

test('picture source is captured, multiple source elements', async ({ page }) => {
  await page.goto('/asset-paths/picture');
});

test('picture source is captured, single source with srcset', async ({ page }) => {
  await page.goto('/asset-paths/picture-multiple-srcset');
});

test('picture captures fallback image', async ({ page }) => {
  await page.goto('/asset-paths/picture-no-matching-source');
});

test('external CSS files are inlined', async ({ page }) => {
  await page.goto('/asset-paths/external-css-files');
});

test('video poster image is rendered', async ({ page }) => {
  await page.goto('/asset-paths/video-poster');
});

test('link tags for fonts preloads and other things are handled', async ({ page }) => {
  await page.goto('/asset-paths/link-tags');
});
