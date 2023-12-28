import fs from 'fs/promises';
import path from 'path';
import { testCases } from '../test-cases';
import { test } from '../../src';

// domain of external image in test (to archive)
test.use({ allowedArchiveDomains: ['some.external'] });

testCases.forEach(({ title, path: urlPath }) => {
  test(title, async ({ page }) => {
    if (title === 'external asset is archived') {
      // mock the external image (which we'll archive)
      await page.route('https://some.external/domain/image.png', async (route) => {
        const file = await fs.readFile(path.join(__dirname, '../fixtures/pink.png'), {
          encoding: 'base64',
        });
        await route.fulfill({ body: Buffer.from(file, 'base64') });
      });
    }

    await page.goto(urlPath);
  });
});
