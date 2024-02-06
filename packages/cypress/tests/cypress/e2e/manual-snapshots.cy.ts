it('multiple snapshots are taken', () => {
  cy.visit('/manual-snapshots');
  // manual snapshot with name
  cy.takeSnapshot('accordion collapsed');
  cy.contains("I'm an accordion, click me!").click();
  // manual snapshot without name
  cy.takeSnapshot();
  cy.contains("I'm an accordion, click me!").click();
  cy.get('details').should('not.have.attr', 'open');
});
