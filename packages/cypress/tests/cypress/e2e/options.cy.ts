it('Options / delay', { env: { delay: 1200 } }, () => {
  cy.visit('/options/delay');
});

it('Options / diff threshold', { env: { diffThreshold: 1 } }, () => {
  cy.visit('/options/diff-threshold');
});

it('Options / pause animation at end', /*{ env: { pauseAnimationAtEnd: true } },*/ () => {
  cy.visit('/options/pause-animation-at-end');
});

it('Options / force high-contrast' /*, { env: { forcedColors: true } }*/, () => {
  cy.visit('/options/forced-colors');
});
