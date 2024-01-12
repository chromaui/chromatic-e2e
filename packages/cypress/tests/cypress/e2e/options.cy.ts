it('Options / delay', { env: { delay: 1200 } }, () => {
  cy.visit('/options/delay');
});

it('Options / diff threshold' /*, { env: { diffThreshold: 1 } }*/, () => {
  cy.visit('/options/diff-threshold');
});
