it('Manual Snapshots / multiple snapshots are taken', () => {
  cy.visit('/manual-snapshots');
  cy.takeSnapshot();
  cy.contains("I'm an accordion, click me!").click();
  cy.contains('I am hiding inside!').should('be.visible');
});
