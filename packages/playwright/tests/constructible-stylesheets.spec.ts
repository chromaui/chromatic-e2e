import fs from 'fs/promises';
import path from 'path';
import { test } from '../src';

test('renders constructible stylesheets', async ({ page }) => {
  await page.goto('/constructible-stylesheets');
});
