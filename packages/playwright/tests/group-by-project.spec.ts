import { test } from '../src';

test.describe(() => {
  test.use({ groupByProject: true });

  test('tests from different files end up in same project directory', async ({ page }) => {
    await page.goto('/options/group-by-project');
  });
});
