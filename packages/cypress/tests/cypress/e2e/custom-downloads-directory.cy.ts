context('using Cypress.config', () => {
  it('Downloads archives to the user-specified folder', () => {
    cy.visit('/viewports');
    const chromaticArchivesDir = `${Cypress.config('downloadsFolder')}/chromatic-archives`;
    cy.task('directoryExists', chromaticArchivesDir).then((dirExists) => {
      expect(dirExists).true;
    });
  });
});
