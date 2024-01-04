it('Forms / form submits succesfully', () => {
  cy.visit('http://localhost:3000/forms');
  cy.contains('Click me').click();
  cy.contains('OK!').should('be.visible');
});
