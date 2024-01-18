import { snapshot } from 'rrweb-snapshot';
import './commands';

const shouldTakeSnapshot = () => {
  return !Cypress.env('disableAutoSnapshot') && !Cypress.config('isInteractive');
};

// these client-side lifecycle hooks will be added to the user's Cypress suite
beforeEach(() => {
  if (!shouldTakeSnapshot()) {
    return;
  }
  // this "manualSnapshots" variable will be available before, during, and after the test,
  // then cleaned up before the next test is run
  // (see https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Aliases)
  cy.wrap([]).as('manualSnapshots');
  cy.task('prepareArchives', {
    action: 'setup-network-listener',
    payload: { allowedDomains: Cypress.env('assetDomains') },
  });
});

afterEach(() => {
  if (!shouldTakeSnapshot()) {
    return;
  }
  // can we be sure this always fires after all the requests are back?
  cy.document().then((doc) => {
    const snap = snapshot(doc);
    // @ts-expect-error will fix when Cypress has its own package
    cy.get('@manualSnapshots').then((manualSnapshots = []) => {
      cy.url().then((url) => {
        // pass the snapshot to the server to write to disk
        cy.task('prepareArchives', {
          action: 'save-archives',
          payload: {
            testTitle: Cypress.currentTest.title,
            domSnapshots: [...manualSnapshots, snap],
            chromaticStorybookParams: {
              ...(Cypress.env('diffThreshold') && { diffThreshold: Cypress.env('diffThreshold') }),
              ...(Cypress.env('delay') && { delay: Cypress.env('delay') }),
              ...(Cypress.env('diffIncludeAntiAliasing') && {
                diffIncludeAntiAliasing: Cypress.env('diffIncludeAntiAliasing'),
              }),
              ...(Cypress.env('diffThreshold') && { diffThreshold: Cypress.env('diffThreshold') }),
              ...(Cypress.env('forcedColors') && { forcedColors: Cypress.env('forcedColors') }),
              ...(Cypress.env('pauseAnimationAtEnd') && {
                pauseAnimationAtEnd: Cypress.env('pauseAnimationAtEnd'),
              }),
              ...(Cypress.env('prefersReducedMotion') && {
                prefersReducedMotion: Cypress.env('prefersReducedMotion'),
              }),
            },
            pageUrl: url,
          },
        });
      });
    });
  });
});
