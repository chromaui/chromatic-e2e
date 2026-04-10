import { describe, test } from 'vitest';

test('test #1', () => {});

describe('suite #2', () => {
  test('test #2', () => {});
});

describe('suite #3', () => {
  describe('nested suite #3', () => {
    test('test #3', () => {});
  });
});
