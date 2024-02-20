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

context('hardcoded viewport', () => {
  beforeEach(() => {
    cy.viewport(800, 720);
  });

  it('does not display the large or small viewport copy', () => {
    cy.visit('/viewports');
  });
});
