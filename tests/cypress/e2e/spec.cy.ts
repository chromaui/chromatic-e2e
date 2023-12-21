describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io');
    expect(1).to.equal(1);
  });
});
