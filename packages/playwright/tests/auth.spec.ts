import { test, expect } from '../src';

test.describe(() => {
  test('can succeed with basic authentication using globally-defined credentials', async ({
    page,
  }) => {
    await page.goto('/protected');

    await expect(page.getByText('I AM PROTECTED!!!')).toBeVisible();
  });
});

test.describe(() => {
  test.use({
    extraHTTPHeaders: {
      Authorization: `Basic ${btoa('admin:supersecret')}`,
    },
  });

  test('can succeed with basic authentication using a locally-defined header that overrides globally-defined credentials', async ({
    page,
  }) => {
    await page.goto('/admin');

    await expect(page.getByText('I AM PROTECTED!!!')).toBeVisible();
  });
});
