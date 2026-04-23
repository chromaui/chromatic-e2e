describe('desktop', { viewportWidth: 1200, viewportHeight: 720 }, () => {
  it('snapshots capture the correct viewport size', () => {
    cy.visit('/viewports');
  });
});

context('mobile', { viewportWidth: 500, viewportHeight: 500 }, () => {
  it('snapshots capture the correct viewport size', () => {
    cy.visit('/viewports');
  });
});

context('using Cypress.config', () => {
  it('does correctly set the viewport for Chromatic snapshots', () => {
    Cypress.config('viewportWidth', 1150);
    Cypress.config('viewportHeight', 500);
    cy.visit('/viewports');
  });
});

context('using cy.viewport', () => {
  it('does correctly set the viewport for Chromatic snapshots', () => {
    cy.viewport(800, 700);
    cy.visit('/viewports');
  });

  it('snapshots capture multiple viewports inside a single test case', () => {
    cy.visit('/viewports');
    cy.contains("I'm always rendered").should('be.visible');
    cy.takeSnapshot('default');

    cy.viewport(480, 320);
    cy.contains('Window width: 480').should('be.visible');
    cy.contains("I'm rendered when the page width is between 500-0").should('be.visible');
    cy.takeSnapshot('480 x 320');

    cy.viewport(850, 500);
    cy.contains('Window width: 850').should('be.visible');
    cy.contains("I'm rendered when the page width is between 900-800").should('be.visible');
    cy.takeSnapshot('850 x 500');

    cy.viewport(1050, 1080);
    cy.contains('Window width: 1050').should('be.visible');
    cy.contains("I'm rendered when the page width is between 1100-1000").should('be.visible');
    cy.takeSnapshot('1050 x 1080');
  });
});
