import { beforeEach, describe, expect } from 'vitest';
import { commands, page } from 'vitest/browser';
import { test } from './utils/browser';
import { takeSnapshot } from '../src';

beforeEach(async () => {
  await emulateColorScheme('no-preference');
});

describe('light color scheme', () => {
  test('renders the light-only content', async ({ goTo }) => {
    await emulateColorScheme('light');
    await goTo('/color-scheme');

    await expect.element(page.getByText('Only visible in LIGHT mode')).toBeVisible();
    await expect.element(page.getByText('Only visible in DARK mode')).not.toBeVisible();
  });
});

describe('dark color scheme', () => {
  test('renders the dark-only content', async ({ goTo }) => {
    await emulateColorScheme('dark');
    await goTo('/color-scheme');

    await expect.element(page.getByText('Only visible in DARK mode')).toBeVisible();
    await expect.element(page.getByText('Only visible in LIGHT mode')).not.toBeVisible();
  });
});

test('captures both color schemes inside a single test case', async ({ goTo }) => {
  await emulateColorScheme('dark');
  await goTo('/color-scheme');
  await expect.element(page.getByText('Only visible in DARK mode')).toBeVisible();
  await takeSnapshot('dark');

  await emulateColorScheme('light');
  await expect.element(page.getByText('Only visible in LIGHT mode')).toBeVisible();
  await takeSnapshot('light');
});

const emulateColorScheme = (commands as any).emulateColorScheme as (
  colorScheme: 'light' | 'dark' | 'no-preference'
) => Promise<void>;
