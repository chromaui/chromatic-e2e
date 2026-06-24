import { describe, test } from 'vitest';
import { configure, takeSnapshot } from '../../src';

test('test #1', () => {});

describe('suite #2', () => {
  test('test #2', () => {});
});

describe('suite #3', () => {
  describe('nested suite #3', () => {
    test('test #3', () => {});
  });
});

test('duplicate test name', () => {});
test('duplicate test name', () => {});
test('duplicate test name', () => {});

test('duplicate test name with special character @', () => {});
test('duplicate test name with special character *', () => {});
test('duplicate test name with special character #', () => {});

test('duplicate snapshot names', async () => {
  configure({ disableAutoSnapshot: true });

  // Duplicate snapshot names override each other
  await takeSnapshot('example');
  await takeSnapshot('example');
});
