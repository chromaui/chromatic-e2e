import './commands';
import { takeSnapshot } from './takeSnapshot';
import { CypressSnapshot } from './types';

const buildChromaticParams = (env: Cypress.Cypress['env']) => ({
  ...(env('diffThreshold') && {
    diffThreshold: env('diffThreshold'),
  }),
  ...(env('delay') && { delay: env('delay') }),
  ...(env('diffIncludeAntiAliasing') && {
    diffIncludeAntiAliasing: env('diffIncludeAntiAliasing'),
  }),
  ...(env('diffThreshold') && {
    diffThreshold: env('diffThreshold'),
  }),
  ...(env('forcedColors') && { forcedColors: env('forcedColors') }),
  ...(env('pauseAnimationAtEnd') && {
    pauseAnimationAtEnd: env('pauseAnimationAtEnd'),
  }),
  ...(env('prefersReducedMotion') && {
    prefersReducedMotion: env('prefersReducedMotion'),
  }),
  ...(env('cropToViewport') && {
    cropToViewport: env('cropToViewport'),
  }),
  ...(env('ignoreSelectors') && {
    ignoreSelectors: env('ignoreSelectors'),
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
    payload: { allowedDomains: Cypress.env('assetDomains') },
  });
});

afterEach(() => {
  // don't take snapshots when running `cypress open`
  if (!Cypress.config('isTextTerminal')) {
    return;
  }
  // can we be sure this always fires after all the requests are back?
  cy.document().then((doc) => {
    cy.wrap(takeSnapshot(doc)).then((automaticSnapshot: CypressSnapshot) => {
      // @ts-expect-error will fix when Cypress has its own package
      cy.get('@manualSnapshots').then((manualSnapshots = []) => {
        cy.url().then((url) => {
          // pass the snapshot to the server to write to disk
          cy.task('prepareArchives', {
            action: 'save-archives',
            payload: {
              // @ts-expect-error relativeToCommonRoot is on spec (but undocumented)
              testTitlePath: [Cypress.spec.relativeToCommonRoot, ...Cypress.currentTest.titlePath],
              domSnapshots: [...manualSnapshots, ...(automaticSnapshot ? [automaticSnapshot] : [])],
              chromaticStorybookParams: buildChromaticParams(Cypress.env),
              pageUrl: url,
              viewport: {
                height: Cypress.config('viewportHeight'),
                width: Cypress.config('viewportWidth'),
              },
              outputDir: Cypress.config('downloadsFolder'),
            },
          });
        });
      });
    });
  });
});
