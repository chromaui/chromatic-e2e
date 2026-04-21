import { afterEach, describe, expect } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';
import { takeSnapshot } from '../src';

afterEach(() => {
  // Remove side effects of {@link file://./../../../test-server/fixtures/viewports.html}
  const updateSize = (globalThis as any).updateSize;

  if (updateSize) {
    removeEventListener('resize', updateSize);
  }
});

test('snapshots capture the correct viewport size', async ({ goTo }) => {
  await goTo('/viewports');
});

describe('hardcoded viewport', () => {
  test('snapshots capture the correct viewport size', async ({ goTo }) => {
    await page.viewport(800, 720);

    await goTo('/viewports');
  });

  test('snapshots capture multiple viewports inside a single test case', async ({ goTo }) => {
    await goTo('/viewports');
    expect(page.getByText("I'm always rendered")).toBeVisible();
    await takeSnapshot('default');

    await page.viewport(480, 320);
    await expect.element(page.getByText('Window width: 480')).toBeVisible();
    await expect
      .element(page.getByText("I'm rendered when the page width is between 500-0"))
      .toBeVisible();
    await takeSnapshot('480 x 320');

    await page.viewport(850, 500);
    await expect.element(page.getByText('Window width: 850')).toBeVisible();
    await expect
      .element(page.getByText("I'm rendered when the page width is between 900-800"))
      .toBeVisible();
    await takeSnapshot('850 x 500');

    await page.viewport(1050, 1080);
    await expect.element(page.getByText('Window width: 1050')).toBeVisible();
    await expect
      .element(page.getByText("I'm rendered when the page width is between 1100-1000"))
      .toBeVisible();
    await takeSnapshot('1050 x 1080');
  });
});
