// Snapshots are disabled because we're asserting on file system concerns,
// not testing anything visual
it(
  'downloads archives to the user-specified folder',
  { env: { disableAutoSnapshot: true } },
  () => {
    cy.visit('/asset-paths/query-params');
    const chromaticArchivesDir = `${Cypress.config('downloadsFolder')}/chromatic-archives`;
    cy.task('directoryExists', chromaticArchivesDir).then((dirExists) => {
      expect(dirExists).to.be.true;
    });
  }
);
