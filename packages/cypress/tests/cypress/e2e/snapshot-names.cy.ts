it('in snapshot name', { expose: { disableAutoSnapshot: true } }, () => {
  cy.visit('/');

  cy.takeSnapshot('あ');
});

it('in test case name あ', { expose: { disableAutoSnapshot: true } }, () => {
  cy.visit('/');

  cy.takeSnapshot();
});
