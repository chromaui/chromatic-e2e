import { afterEach, describe } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';

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
});
