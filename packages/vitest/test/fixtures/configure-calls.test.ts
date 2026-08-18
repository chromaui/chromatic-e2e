import { describe, test } from 'vitest';
import { configure } from '../../src';

configure({ delay: 1234, title: 'Configure calls on different scopes' });

test('test #1', () => {
  configure({ diffThreshold: 1, resourceArchiveTimeout: 1234 });
});

describe('', () => {
  configure({ ignoreSelectors: ['.example'] });

  test('test #2', () => {});
});
