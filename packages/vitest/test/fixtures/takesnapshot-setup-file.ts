import { afterEach } from 'vitest';
import { takeSnapshot } from '../../src';

afterEach(async () => {
  document.body.innerHTML = '<h1>This should be in user snapshot</h1>';

  await takeSnapshot("user's after each snapshot!");
});
