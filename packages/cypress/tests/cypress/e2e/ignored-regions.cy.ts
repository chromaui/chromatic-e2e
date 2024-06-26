// NOTE: This is a test that is meant to be run through Chromatic, so it doesn't actually work
//       with the automated test suite.
it('ignored regions work with chromatic', () => {
  cy.visit('/ignore');
  cy.wait(1000);
});
