import { test, expect } from '../src';

const httpCredentials = {
  username: 'admin',
  password: 'supersecret',
};

test.describe(() => {
  test.use({
    extraHTTPHeaders: {
      Authorization: `Basic ${btoa(`${httpCredentials.username}:${httpCredentials.password}`)}`,
    },
  }),
    test('can login', async ({ page }) => {
      await page.goto('/im-protected');

      await expect(page.getByText('I AM PROTECTED!!!')).toBeVisible();
    });
});
