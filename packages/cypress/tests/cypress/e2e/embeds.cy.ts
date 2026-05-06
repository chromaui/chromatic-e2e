it('same-origin embed page loads', () => {
  cy.visit('/embeds/same-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Same-origin iframe"]').should('be.visible');
});

it('cross-origin embed page loads', () => {
  cy.visit('/embeds/cross-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Cross-origin iframe"]').should('be.visible');
  cy.request('http://localhost:3001/').its('body').should('include', 'Embedded page');
});

it('embedded page background color can be changed', () => {
  cy.visit('/embeds/embedded-page');
  cy.contains('h1', 'Embedded page').should('be.visible');

  cy.contains('button', 'Red').click();
  cy.get('body').should('have.css', 'background-color', 'rgb(255, 0, 0)');
  cy.takeSnapshot('Red background');

  cy.contains('button', 'Yellow').click();
  cy.get('body').should('have.css', 'background-color', 'rgb(255, 255, 0)');
  cy.takeSnapshot('Yellow background');

  cy.contains('button', 'Blue').click();
  cy.get('body').should('have.css', 'background-color', 'rgb(0, 0, 255)');
  cy.takeSnapshot('Blue background');

  cy.contains('button', 'Reset').click();
  cy.get('body').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  cy.takeSnapshot('Reset background');
});
