import { test } from './utils/browser';
import { configure } from '../dist';

test('delay', async ({ goTo }) => {
  configure({ delay: 2500 });

  await goTo('/options/delay');
});

test('diff threshold', async ({ goTo }) => {
  configure({ diffThreshold: 1 });

  await goTo('/options/diff-threshold');
});

test('pause animation at end', async ({ goTo }) => {
  configure({ pauseAnimationAtEnd: true });

  await goTo('/options/pause-animation-at-end');
});

test('force high-contrast', async ({ goTo }) => {
  configure({ forcedColors: 'active' });

  await goTo('/options/forced-colors');
});

test('prefers reduced motion', async ({ goTo }) => {
  configure({ prefersReducedMotion: 'reduce' });

  await goTo('/options/prefers-reduced-motion');
});

test('crops to viewport', async ({ goTo }) => {
  configure({ cropToViewport: true });

  await goTo('/options/crop-to-viewport');
});

test('does not crop to viewport by default', async ({ goTo }) => {
  await goTo('/options/crop-to-viewport');
});
