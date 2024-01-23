it('delay', { env: { delay: 1200 } }, () => {
  cy.visit('/options/delay');
});

it('diff threshold', { env: { diffThreshold: 1 } }, () => {
  cy.visit('/options/diff-threshold');
});

it('pause animation at end', { env: { pauseAnimationAtEnd: true } }, () => {
  cy.visit('/options/pause-animation-at-end');
});

it('force high-contrast', { env: { forcedColors: 'active' } }, () => {
  cy.visit('/options/forced-colors');
});

it('prefers reduced motion', { env: { prefersReducedMotion: 'reduce' } }, () => {
  cy.visit('/options/prefers-reduced-motion');
});
