import { beforeAll, describe, expect, test, inject } from 'vitest';
import { waitForIdleNetwork } from '../../src';

test.runIf(inject('testName') === 'one')('test #1', async () => {
  document.body.innerHTML = '<h1>Example heading</h1>';

  await waitForIdleNetwork(1);

  expect.fail('Should not reach this point');
});

describe.runIf(inject('testName') === 'two')('suite', async () => {
  beforeAll(async () => {
    await waitForIdleNetwork(1);
  });

  test('test #2', async () => {});
});
