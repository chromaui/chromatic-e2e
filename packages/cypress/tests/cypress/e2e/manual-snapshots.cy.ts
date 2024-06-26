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

it(
  'manual snapshot is taken even when automatic snapshots are turned off',
  { env: { disableAutoSnapshot: true } },
  () => {
    cy.visit('/manual-snapshots');
    cy.contains("I'm an accordion, click me!").click();
    cy.takeSnapshot('Manual snapshot without automatic snapshot');
  }
);
