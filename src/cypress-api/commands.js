import { snapshot } from '@chromaui/rrweb-snapshot';

Cypress.Commands.add('takeChromaticSnapshot', () => {
  cy.document().then((doc) => {
    const snap = snapshot(doc, { noAbsolute: true });
    // pass the snapshot to the server to write to disk
    cy.task('passSnapshot', snap);
  });
});
