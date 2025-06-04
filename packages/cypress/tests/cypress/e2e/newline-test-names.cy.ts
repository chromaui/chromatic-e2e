describe(`
Test
name
newlines
`, () => {
  it('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', () => {
    cy.visit('/');
  });
});
