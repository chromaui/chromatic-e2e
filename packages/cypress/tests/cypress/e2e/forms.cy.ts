it('Forms / form submits successfully', () => {
  cy.visit('/forms');
  cy.contains('Click me').click();
  cy.contains('OK!').should('be.visible');
});
