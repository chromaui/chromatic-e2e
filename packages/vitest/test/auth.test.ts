import { expect } from 'vitest';
import { page } from 'vitest/browser';
import { test } from './utils/browser';

test.override({ url: '/protected' });

test('can succeed with basic authentication using globally-defined credentials', async () => {
  expect(page.getByText('I AM PROTECTED!!!')).toBeVisible();
});
