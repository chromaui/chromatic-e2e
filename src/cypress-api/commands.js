import { snapshot } from '@chromaui/rrweb-snapshot';

Cypress.Commands.add('takeChromaticArchive', () => {
  cy.document().then((doc) => {
    // here, handle the source map
    const manualSnapshot = snapshot(doc, { noAbsolute: true });
    // reassign manualSnapshots so it includes this new snapshot
    cy.get('@manualSnapshots')
      .then((snapshots) => {
        return [...snapshots, manualSnapshot];
      })
      .as('manualSnapshots');
  });
});
