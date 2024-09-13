import { snapshot } from '@chromaui/rrweb-snapshot';
import type { elementNode } from '@chromaui/rrweb-snapshot';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Method for taking a manual snapshot with Chromatic
       *
       *
       * @param {string} name - Use to apply a custom name to the snapshot  (optional)
       */
      takeSnapshot(name?: string): Chainable<any>;
    }
  }
}

Cypress.Commands.add('takeSnapshot', (name?: string) => {
  // don't take snapshots when running `cypress open`
  if (!Cypress.config('isTextTerminal')) {
    return;
  }

  cy.document().then((doc) => {
    // here, handle the source map
    const manualSnapshot = snapshot(doc);
    // reassign manualSnapshots so it includes this new snapshot
    cy.get('@manualSnapshots')
      // @ts-expect-error will fix when Cypress has its own package
      .then((snapshots: elementNode[]) => {
        return [...snapshots, { name, snapshot: manualSnapshot }];
      })
      .as('manualSnapshots');
  });
});
