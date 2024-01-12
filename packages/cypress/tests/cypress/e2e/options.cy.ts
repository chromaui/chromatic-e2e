it('Options / delay', { env: { delay: 1200 } }, () => {
  cy.visit('/options/delay');
});

it('Options / diff threshold', { env: { diffThreshold: 1 } }, () => {
  cy.visit('/options/diff-threshold');
});

it('Options / pause animation at end', /*{ env: { pauseAnimationAtEnd: true } },*/ () => {
  cy.visit('/options/pause-animation-at-end');
});

it('Options / force high-contrast', { env: { forcedColors: 'active' } }, () => {
  cy.visit('/options/forced-colors');
});

it('Options / prefers reduced motion', { env: { prefersReducedMotion: 'reduce' } }, () => {
  cy.visit('/options/prefers-reduced-motion');
});
