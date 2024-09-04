it('can succeed with basic authentication using locally defined credentials', () => {
  cy.visit('/protected', {
    auth: {
      username: 'user',
      password: 'secret',
    },
  });
  cy.contains('I AM PROTECTED!!!').should('be.visible');
});
