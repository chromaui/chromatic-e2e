// NOTE: This is a test that is meant to be run through Chromatic, so it doesn't actually work
//       with the automated test suite.
it('Ignored Regions / ignored regions work with chromatic', () => {
  cy.visit('http://localhost:3000/ignore');
  cy.wait(1000);
});
