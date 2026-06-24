describe('duplicate test names', () => {
  it('example', () => {
    cy.visit('/');
  });

  it('example', () => {
    cy.visit('/');
  });
});

it('duplicate snapshot names', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/');

  cy.takeSnapshot('example');
  cy.takeSnapshot('example');
});
