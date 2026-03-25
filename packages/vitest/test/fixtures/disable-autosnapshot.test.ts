import { describe, test, inject } from 'vitest';
import { disableAutoSnapshot } from '../../src';

const disable = inject('disableAutoSnapshot');

function disableIf(condition: boolean) {
  if (condition) {
    disableAutoSnapshot();
  }
}

disableIf(disable === 'module');

test('test #1', () => {
  disableIf(disable === 'test');
});

describe('', () => {
  disableIf(disable === 'describe');

  test('test #2', () => {
    disableIf(disable === 'test' || disable === 'test-second');
  });
});

describe('', () => {
  disableIf(disable === 'describe');

  describe('', () => {
    disableIf(disable === 'describe-nested');

    test('test #3', () => {
      disableIf(disable === 'test');
    });
  });

  test('test #4', () => {
    disableIf(disable === 'test');
  });
});

test('test #5', () => {
  disableIf(disable === 'test');
});
