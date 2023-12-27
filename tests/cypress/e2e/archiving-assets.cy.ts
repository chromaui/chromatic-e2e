describe('template spec', () => {
  it('uses query params to determine which asset is served', () => {
    cy.visit('http://localhost:3000/asset-paths/query-params');
  });
});
