import fs from 'fs/promises';
import path from 'path';
import { test } from '../src';

// domain of external image in test (to archive)
test.use({ assetDomains: ['some.external'] });

test('Assets / query params determine which asset is served', async ({ page }) => {
  await page.goto('/asset-paths/query-params');
});

test('Assets / asset doesnt prevent directory from being created', async ({ page }) => {
  await page.goto('/asset-paths/asset-at-directory-name');
});

test('Assets / asset is found at relative path', async ({ page }) => {
  await page.goto('/asset-paths/relative-path');
});

test('Assets / long file names are allowed', async ({ page }) => {
  await page.goto('/asset-paths/long-file-name');
});

test('Assets / external asset is not archived (but still renders)', async ({ page }) => {
  await page.goto('/asset-paths/external-asset-not-archived');
});

test('Assets / external asset is archived', async ({ page }) => {
  // mock the external image (which we'll archive)
  await page.route('https://some.external/domain/image.png', async (route) => {
    const file = await fs.readFile(path.join(__dirname, '../../../test-server/fixtures/pink.png'), {
      encoding: 'base64',
    });
    await route.fulfill({ body: Buffer.from(file, 'base64') });
  });

  await page.goto('/asset-paths/external-asset-archived');
});

test('Assets / assets from css urls are archived', async ({ page }) => {
  await page.goto('/asset-paths/css-urls');
});

test('Assets / percents in URLs are handled', async ({ page }) => {
  await page.goto('/asset-paths/percents');
});

test('Assets / srcset is used to determine image asset URL', async ({ page }) => {
  await page.goto('/asset-paths/srcset');
});

test('Assets / external CSS files are inlined', async ({ page }) => {
  await page.goto('/asset-paths/external-css-files');
});
