import { describe, beforeEach } from 'vitest';
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

describe('interactive', () => {
  configure({ disableAutoSnapshot: false });

  describe('keyboard', () => {
    configure({ disableAutoSnapshot: true });

    test('opens and closes', async () => {
      await takeSnapshot('default');
      await takeSnapshot('open');
      await takeSnapshot('close');
    });

    test('toggled via space and enter', async () => {
      await takeSnapshot('default');
      await takeSnapshot('toggle with space');
      await takeSnapshot('toggle with enter');
    });
  });

  describe('mouse', () => {
    test('opens and closes', async () => {});
    test('can be dragged', async () => {});
  });
});

describe('', () => {
  configure({ title: 'Components/Button', disableAutoSnapshot: false });

  beforeEach(() => {
    document.body.innerHTML = '<button>Example</button>';
  });

  test('Primary', () => {});
  test('Secondary', () => {});
  test('Hovered', () => {});
  test('Pressed', () => {});
  test('Focused', () => {});
  test('Disabled', () => {});
});
