it('Assets / query params determine which asset is served', () => {
  cy.visit('/manual-snapshots');
  cy.takeChromaticArchive();
  cy.contains("I'm an accordion, click me!").click();
});
