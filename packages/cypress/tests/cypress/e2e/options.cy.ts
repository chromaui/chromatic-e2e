it('delay', { expose: { delay: 2500 } }, () => {
  cy.visit('/options/delay');
});

it('diff threshold', { expose: { diffThreshold: 1 } }, () => {
  cy.visit('/options/diff-threshold');
});

it('pause animation at end', { expose: { pauseAnimationAtEnd: true } }, () => {
  cy.visit('/options/pause-animation-at-end');
});

it('force high-contrast', { expose: { forcedColors: 'active' } }, () => {
  cy.visit('/options/forced-colors');
});

it('prefers reduced motion', { expose: { prefersReducedMotion: 'reduce' } }, () => {
  cy.visit('/options/prefers-reduced-motion');
});

it('crops to viewport', { expose: { cropToViewport: true } }, () => {
  cy.visit('/options/crop-to-viewport');
});

it('does not crop to viewport by default', () => {
  cy.visit('/options/crop-to-viewport');
});
