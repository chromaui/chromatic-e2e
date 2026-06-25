import { expect, takeSnapshot, test } from '../src';

test.describe('light color scheme', () => {
  test.use({ colorScheme: 'light' });

  test('renders the light-only content', async ({ page }) => {
    await page.goto('/color-scheme');

    await expect(page.getByText('Only visible in LIGHT mode')).toBeVisible();
    await expect(page.getByText('Only visible in DARK mode')).toBeHidden();
  });
});

test.describe('dark color scheme', () => {
  test.use({ colorScheme: 'dark' });

  test('renders the dark-only content', async ({ page }) => {
    await page.goto('/color-scheme');

    await expect(page.getByText('Only visible in DARK mode')).toBeVisible();
    await expect(page.getByText('Only visible in LIGHT mode')).toBeHidden();
  });
});

test.describe(() => {
  test.use({ disableAutoSnapshot: true });

  test('captures both color schemes inside a single test case', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/color-scheme');
    await expect(page.getByText('Only visible in DARK mode')).toBeVisible();
    await takeSnapshot(page, 'dark', testInfo);

    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.getByText('Only visible in LIGHT mode')).toBeVisible();
    await takeSnapshot(page, 'light', testInfo);
  });
});
