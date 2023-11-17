import fs from 'fs/promises';
import path from 'path';
import { test } from '../src';

// domain of external image in test (to archive)
test.use({ allowedArchiveDomains: ['some.external'] });

test('asset paths', async ({ page }) => {
  // mock the external image (which we'll archive)
  await page.route('https://some.external/domain/image.png', async (route) => {
    const file = await fs.readFile(path.join(__dirname, 'fixtures/pink.png'), {
      encoding: 'base64',
    });
    await route.fulfill({ body: Buffer.from(file, 'base64') });
  });

  await page.goto('/asset-paths/');
});
