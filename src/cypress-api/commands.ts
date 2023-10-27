import { snapshot } from '@chromaui/rrweb-snapshot';
// @ts-ignore
Cypress.Commands.add('takeChromaticArchive', () => {
  // @ts-ignore
  cy.document().then((doc) => {
    // here, handle the source map
    const manualSnapshot = snapshot(doc, { noAbsolute: true });
    // reassign manualSnapshots so it includes this new snapshot
    // @ts-ignore
    cy.get('@manualSnapshots')
      // @ts-ignore
      .then((snapshots) => {
        return [...snapshots, manualSnapshot];
      })
      .as('manualSnapshots');
  });
});
