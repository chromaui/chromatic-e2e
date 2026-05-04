import { expect, test, takeSnapshot } from '../src';

test.use({ disableAutoSnapshot: true });

test('captures :hover state', async ({ page }, testInfo) => {
  await page.goto('/css-pseudo-states');

  await page.locator('button#target').hover();
  expect(page.locator('button:hover')).toBeVisible();

  await takeSnapshot(page, 'hover', testInfo);
});

test('captures :focus state', async ({ page }, testInfo) => {
  await page.goto('/css-pseudo-states');

  await page.getByRole('button', { name: 'target' }).click();
  expect(page.locator('button:focus')).toBeVisible();

  await takeSnapshot(page, 'focus', testInfo);
});

test('captures :focus-visible state', async ({ page }, testInfo) => {
  await page.goto('/css-pseudo-states');

  await page.getByRole('button', { name: 'Focus this before tab' }).click();
  await page.keyboard.press('Tab');

  expect(page.locator('button:focus-visible')).toBeVisible();

  await takeSnapshot(page, 'focus-visible', testInfo);
});

test('captures :active state', async ({ page }, testInfo) => {
  await page.goto('/css-pseudo-states');

  const box = await page.locator('button#target').boundingBox();

  if (!box) {
    throw new Error('Cannot find button#target');
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();

  expect(page.locator('button:active')).toBeVisible();

  await takeSnapshot(page, 'active', testInfo);
});
