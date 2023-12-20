describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io');
    // @ts-expect-error this "expect" is Cypress (Mocha), not Jest
    expect(1).to.equal(1);
  });
});
