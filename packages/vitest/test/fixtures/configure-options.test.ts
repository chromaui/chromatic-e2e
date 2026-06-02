import { describe, test, inject } from 'vitest';
import { configure } from '../../src';

const scope = inject('configureScope');
const options = inject('configureOptions');

function configureIf(condition: boolean) {
  if (condition) {
    configure(options);
  }
}

configureIf(scope === 'module');

test('test #1', () => {
  configureIf(scope === 'test');
});

describe('', () => {
  configureIf(scope === 'describe');

  test('test #2', () => {
    configureIf(scope === 'test' || scope === 'test-second');
  });
});

describe('', () => {
  configureIf(scope === 'describe');

  describe('', () => {
    configureIf(scope === 'describe-nested');

    test('test #3', () => {
      configureIf(scope === 'test');
    });
  });

  test('test #4', () => {
    configureIf(scope === 'test');
  });
});

test('test #5', () => {});
