import { test, expect } from '../src';

test('it should not break when there is a file and a directory with the same name', async ({
  page,
}) => {
  await page.goto('/conflict');
  const imgLocator1 = page.locator('#cloudImg');
  const imgLocator2 = page.locator('#toonImg');
  expect(imgLocator1).not.toBeNull();
  expect(imgLocator2).not.toBeNull();
});
