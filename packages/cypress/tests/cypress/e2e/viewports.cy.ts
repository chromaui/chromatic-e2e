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
  it('does not correctly set the viewport for Chromatic snapshots', () => {
    Cypress.config('viewportWidth', 850);
    Cypress.config('viewportHeight', 750);
    cy.visit('/viewports');
  });
});

context('using cy.viewport', () => {
  beforeEach(() => {
    cy.viewport(800, 700);
  });

  it('does not correctly set the viewport for Chromatic snapshots', () => {
    cy.visit('/viewports');
  });
});
