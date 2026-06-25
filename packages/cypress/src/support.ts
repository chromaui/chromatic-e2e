import './commands';
import { takeSnapshot } from './takeSnapshot';
import { CypressSnapshot } from './types';

const buildChromaticParams = (expose: Cypress.Cypress['expose']) => ({
  ...(expose('diffThreshold') && {
    diffThreshold: expose('diffThreshold'),
  }),
  ...(expose('delay') && { delay: expose('delay') }),
  ...(expose('diffIncludeAntiAliasing') && {
    diffIncludeAntiAliasing: expose('diffIncludeAntiAliasing'),
  }),
  ...(expose('diffThreshold') && {
    diffThreshold: expose('diffThreshold'),
  }),
  ...(expose('forcedColors') && { forcedColors: expose('forcedColors') }),
  ...(expose('pauseAnimationAtEnd') && {
    pauseAnimationAtEnd: expose('pauseAnimationAtEnd'),
  }),
  ...(expose('prefersReducedMotion') && {
    prefersReducedMotion: expose('prefersReducedMotion'),
  }),
  ...(expose('cropToViewport') && {
    cropToViewport: expose('cropToViewport'),
  }),
  ...(expose('ignoreSelectors') && {
    ignoreSelectors: expose('ignoreSelectors'),
  }),
});

// these client-side lifecycle hooks will be added to the user's Cypress suite
beforeEach(() => {
  // don't take snapshots when running `cypress open`
  if (!Cypress.config('isTextTerminal')) {
    return;
  }
  // this "manualSnapshots" variable will be available before, during, and after the test,
  // then cleaned up before the next test is run
  // (see https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Aliases)
  cy.wrap([]).as('manualSnapshots');
  cy.task('prepareArchives', {
    action: 'setup-network-listener',
    payload: { allowedDomains: Cypress.expose('assetDomains') },
  });
});

afterEach(() => {
  // don't take snapshots when running `cypress open`
  if (!Cypress.config('isTextTerminal')) {
    return;
  }
  cy.window().then((win) => {
    const viewport = { width: win.innerWidth, height: win.innerHeight };
    // can we be sure this always fires after all the requests are back?
    cy.document().then((doc) => {
      cy.wrap(takeSnapshot(doc, viewport)).then((automaticSnapshot: CypressSnapshot) => {
        // @ts-expect-error will fix when Cypress has its own package
        cy.get('@manualSnapshots').then((manualSnapshots = []) => {
          cy.url().then((url) => {
            // pass the snapshot to the server to write to disk
            cy.task('prepareArchives', {
              action: 'save-archives',
              payload: {
                testTitlePath: [
                  // @ts-expect-error relativeToCommonRoot is on spec (but undocumented)
                  Cypress.spec.relativeToCommonRoot,
                  ...Cypress.currentTest.titlePath,
                ],
                domSnapshots: [
                  ...manualSnapshots,
                  ...(automaticSnapshot ? [automaticSnapshot] : []),
                ],
                chromaticStorybookParams: buildChromaticParams(Cypress.expose),
                pageUrl: url,
                outputDir: Cypress.config('downloadsFolder'),
              },
            });
          });
        });
      });
    });
  });
});
