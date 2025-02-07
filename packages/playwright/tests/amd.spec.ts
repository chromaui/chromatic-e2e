import * as path from 'path';
import { test, expect } from '../src';

test.use({ ignoreSelectors: ['#objectUrl'] });
test('pages with AMD modules are archived', async ({ page }) => {
  await page.goto('/amd');
  await expect(page.getByText('Sum of')).toBeVisible();

  // why are we testing blob URL stuff here? Because with AMD,
  // we need to call this blob stuff separately than non-AMD
  const fileWithPath = path.join(__dirname, '../../../test-server/fixtures/blue.png');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#fileInput').click(),
  ]);
  await fileChooser.setFiles([fileWithPath]);
  await page.locator('#fileInput').dispatchEvent('change');
  await expect(page.locator('#objectUrl')).toHaveText(/blob:.*/);
});
