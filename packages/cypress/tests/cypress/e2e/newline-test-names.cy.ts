describe(`
Test
name
newlines
`, () => {
  it('Are\n\rRemoved\r\nFrom\nFile\rNames\n\n\r\r', () => {
    cy.visit('/');
  });

  it('newlines in snapshot name', { expose: { disableAutoSnapshot: true } }, () => {
    cy.visit('/');
    cy.takeSnapshot('snapshot name\nwith newlines\r\nand carriage returns');
  });
});
