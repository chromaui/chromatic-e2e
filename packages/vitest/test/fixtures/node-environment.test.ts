import { expect, test } from 'vitest';

test('is running on NodeJS', () => {
  expect(globalThis.window).toBeUndefined();
  expect(globalThis.document).toBeUndefined();

  expect(globalThis.process).toBeDefined();
  expect(process.versions).toHaveProperty('node');
});
