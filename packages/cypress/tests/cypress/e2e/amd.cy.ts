it('pages with AMD modules are archived', { env: { ignoreSelectors: ['#objectUrl'] } }, () => {
  cy.visit('/amd');
  cy.get('#output').contains('Sum of');

  cy.get('#fileInput').selectFile('../../../test-server/fixtures/blue.png');

  cy.get('#objectUrl')
    .invoke('text')
    .should('match', /blob:.*/);
});
