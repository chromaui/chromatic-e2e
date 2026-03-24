import { beforeAll, describe, expect, test, inject } from 'vitest';
import { takeSnapshot } from '../../src';

test.runIf(inject('testName') === 'one')('test #1', async () => {
  document.body.innerHTML = '<h1>Example heading</h1>';

  await takeSnapshot();

  expect.fail('Should not reach this point');
});

describe.runIf(inject('testName') === 'two')('suite', async () => {
  beforeAll(async () => {
    await takeSnapshot();
  });

  test('test #2', async () => {});
});

test.runIf(inject('testName') === 'three')('test #3', async () => {
  document.body.innerHTML = '<h1>Example heading</h1>';

  takeSnapshot(); // Leave the promise floating, no await

  // another
  takeSnapshot();
});
