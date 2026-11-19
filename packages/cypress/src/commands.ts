import { takeSnapshot as takeChromaticSnapshot } from "./takeSnapshot";
import { CypressSnapshot } from "./types";

/**
 * Custom commands added to `cy` by `@chromatic-com/cypress/support`.
 *
 * Exported so that the emitted `support.d.mts` is a module: `declare global` is only allowed in modules.
 */
export interface ChromaticCommands {
  /**
   * Method for taking a manual snapshot with Chromatic
   *
   *
   * @param {string} name - Use to apply a custom name to the snapshot  (optional)
   */
  takeSnapshot(name?: string): Cypress.Chainable<any>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Chainable extends ChromaticCommands {}
  }
}

Cypress.Commands.add("takeSnapshot", (name?: string) => {
  // don't take snapshots when running `cypress open`
  if (!Cypress.config("isTextTerminal")) {
    return;
  }

  cy.window().then((win) => {
    const viewport = { width: win.innerWidth, height: win.innerHeight };
    const colorScheme = win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

    cy.document().then((doc) => {
      // here, handle the source map

      cy.wrap(takeChromaticSnapshot(doc, viewport, colorScheme, true)).then(
        (manualSnapshot: CypressSnapshot) => {
          // reassign manualSnapshots so it includes this new snapshot
          cy.get("@manualSnapshots")
            .then((snapshots: CypressSnapshot[]) => {
              return [...snapshots, { ...manualSnapshot, name }];
            })
            .as("manualSnapshots");
        },
      );
    });
  });
});
