import { describe, test } from 'vitest';

test('test #1', { tags: ['example-1'] }, () => {});

describe('', { tags: ['example-2'] }, () => {
  test('test #2', () => {});
});

describe('', { tags: ['example-3'] }, () => {
  describe('', { tags: ['example-4'] }, () => {
    test('test #3', () => {});
  });

  test('test #4', () => {});
});

test('test #5', () => {});
