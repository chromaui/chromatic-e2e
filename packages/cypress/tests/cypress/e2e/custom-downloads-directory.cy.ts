context('using Cypress.config', () => {
  it('Downloads archives to the user-specified folder', () => {
    cy.visit('/viewports');
    const dirExists = cy.task('directoryExists', '/some-dir');
    console.log('DIRECTORY EXISTS', dirExists);
  });
});
