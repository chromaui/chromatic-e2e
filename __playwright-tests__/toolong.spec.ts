import { test, expect } from '../src';

test.skip('it should not break when a piece of a filename is longer than 256 bytes', async ({
  page,
}) => {
  await page.goto('/toolong');
  const imgLocator = page.locator('#cloudImg');
  expect(imgLocator).not.toBeNull();
});
