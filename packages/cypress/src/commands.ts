import { takeSnapshot } from './takeSnapshot';
import { CypressSnapshot } from './types';

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

    cy.wrap(takeSnapshot(doc)).then((manualSnapshot: CypressSnapshot) => {
      // reassign manualSnapshots so it includes this new snapshot
      cy.get('@manualSnapshots')
        // @ts-expect-error will fix when Cypress has its own package
        .then((snapshots: CypressSnapshot[]) => {
          return [...snapshots, { ...manualSnapshot, name }];
        })
        .as('manualSnapshots');
    });
  });
});
