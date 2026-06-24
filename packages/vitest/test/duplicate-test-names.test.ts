import { configure, takeSnapshot } from '../dist';
import { test } from './utils/browser';

test.each(['one', 'two'])('duplicate test name', async (label) => {
  document.body.innerHTML = `<button>${label}</button>`;
});

test('duplicate snapshot names', async () => {
  configure({ disableAutoSnapshot: true });

  document.body.innerHTML = `<button>Example</button>`;

  await takeSnapshot('example');
  await takeSnapshot('example');
});
