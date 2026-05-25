import { test } from './utils/browser';
import { configure, takeSnapshot } from '../dist';

configure({ disableAutoSnapshot: true });

test('in snapshot name', async () => {
  document.body.innerHTML = '<div>Test #1</div>';

  await takeSnapshot('あ');
});

test('in test case name あ', async () => {
  document.body.innerHTML = '<div>Test #2</div>';

  await takeSnapshot();
});
