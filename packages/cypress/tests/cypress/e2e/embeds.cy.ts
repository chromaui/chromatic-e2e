it('same-origin embed page loads', () => {
  cy.visit('/embeds/same-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Same-origin iframe"]').should('be.visible');
});

it('cross-origin embed page loads', () => {
  cy.visit('/embeds/cross-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Cross-origin iframe"]').should('be.visible');
  cy.request('http://localhost:3001/')
    .its('body')
    .should('include', 'Testing testing just a basic page');
});
