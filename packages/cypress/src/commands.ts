import { snapshot } from 'rrweb-snapshot';
import type { elementNode } from 'rrweb-snapshot';
// @ts-expect-error will fix when Cypress has its own package
Cypress.Commands.add('takeSnapshot', (name?: string) => {
  // don't take snapshots when running `cypress open`
  if (Cypress.config('isTextTerminal')) {
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
