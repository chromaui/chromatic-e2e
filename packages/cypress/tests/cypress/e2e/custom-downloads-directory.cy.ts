it(
  'downloads archives to the user-specified folder',
  { env: { disableAutoSnapshot: true } },
  () => {
    cy.visit('/asset-paths/query-params');
    const chromaticArchivesDir = `${Cypress.config('downloadsFolder')}/chromatic-archives`;
    cy.task('directoryExists', chromaticArchivesDir).then((dirExists) => {
      expect(dirExists).true;
    });
  }
);
