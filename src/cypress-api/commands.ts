// @ts-nocheck

import { snapshot } from '@chromaui/rrweb-snapshot';

export const addCommands = () => {
  Cypress.Commands.add('takeArchive', () => {
    cy.document().then((doc) => {
      // here, handle the source map
      const snappy = snapshot(doc, { noAbsolute: true });
      // reassign manualSnapshots so it includes this new element
      cy.get('@manualSnapshots')
        .then((snappies) => [...snappies, snappy])
        .as('manualSnapshots');
    });
  });
};
