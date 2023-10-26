// @ts-nocheck

import { snapshot } from '@chromaui/rrweb-snapshot';

Cypress.Commands.add('takeChromaticArchive', () => {
  cy.document().then((doc) => {
    // here, handle the source map
    const snappy = snapshot(doc, { noAbsolute: true });
    // reassign manualSnapshots so it includes this new element
    cy.get('@manualSnapshots')
      .then((snappies) => {
        return [...snappies, snappy];
      })
      .as('manualSnapshots');
  });
});
