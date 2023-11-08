import { snapshot } from '@chromaui/rrweb-snapshot';
import type { elementNode } from '@chromaui/rrweb-snapshot';
// @ts-expect-error will fix when Cypress has its own package
Cypress.Commands.add('takeChromaticArchive', () => {
  cy.document().then((doc) => {
    // here, handle the source map
    const manualSnapshot = snapshot(doc, { noAbsolute: true });
    // reassign manualSnapshots so it includes this new snapshot
    cy.get('@manualSnapshots')
      // @ts-expect-error will fix when Cypress has its own package
      .then((snapshots: elementNode[]) => {
        return [...snapshots, manualSnapshot];
      })
      .as('manualSnapshots');
  });
});
