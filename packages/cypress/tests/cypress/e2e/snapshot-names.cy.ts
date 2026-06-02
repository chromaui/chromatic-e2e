it('in snapshot name', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/');

  cy.takeSnapshot('あ');
});

it('in test case name あ', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/');

  cy.takeSnapshot();
});
