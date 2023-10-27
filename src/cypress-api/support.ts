import { snapshot } from '@chromaui/rrweb-snapshot';
import './commands';

const setupNetworkListener = () => {
  let pageUrl = '';
  // these "archive" and "manualSnapshots" variables will be available before, during, and after the test,
  // then cleaned up before the next test is run
  // (see https://docs.cypress.io/guides/core-concepts/variables-and-aliases#Aliases)
  // @ts-expect-error will fix when Cypress has its own package
  cy.wrap({}).as('archive');
  // @ts-expect-error will fix when Cypress has its own package
  cy.wrap([]).as('manualSnapshots');

  // since we don't know where the user will navigate, we'll archive whatever domain they're on first.
  // @ts-expect-error will fix when Cypress has its own package
  cy.intercept(`**/*`, (req) => {
    // don't archive the page itself -- we'll do that with rrweb
    // TODO: See if this will work for both slash and not slash endings or if we have to do same "first URL visited" stuff
    if (!pageUrl) {
      // @ts-expect-error will fix when Cypress has its own package
      pageUrl = new URL(req.url);
      return;
    }

    const url = new URL(req.url);
    // @ts-expect-error will fix when Cypress has its own package
    if (url.origin !== pageUrl.origin) {
      return;
    }

    // cached (304) responses don't provide a body, so we need to make sure cache is blown away
    // (https://glebbahmutov.com/blog/cypress-intercept-problems/#cached-response)
    // https://github.com/cypress-io/cypress/issues/15680
    delete req.headers['if-none-match'];
    // I added this since some css files still are cached... not sure if this is great
    // (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/304)
    delete req.headers['if-modified-since'];
    // @ts-expect-error will fix when Cypress has its own package
    req.continue((response) => {
      // @ts-expect-error will fix when Cypress has its own package
      cy.get('@archive').then((archive) => {
        archive[response.url] = {
          statusCode: response.statusCode,
          statusText: response.statusMessage,
          body: response.body,
        };
      });
    });
  });
};

const completeArchive = () => {
  // @ts-expect-error will fix when Cypress has its own package
  cy.get('@archive').then((archive) => {
    // can we be sure this always fires after all the requests are back?
    // @ts-expect-error will fix when Cypress has its own package
    cy.document().then((doc) => {
      const snap = snapshot(doc, { noAbsolute: true });
      // @ts-expect-error will fix when Cypress has its own package
      cy.get('@manualSnapshots').then((manualSnapshots = []) => {
        // pass the snapshot to the server to write to disk
        // @ts-expect-error will fix when Cypress has its own package
        cy.task('archiveCypress', {
          // @ts-expect-error will fix when Cypress has its own package
          testTitle: Cypress.currentTest.title,
          domSnapshots: [...manualSnapshots, snap],
          resourceArchive: archive,
          chromaticStorybookParams: {
            // @ts-expect-error will fix when Cypress has its own package
            diffThreshold: Cypress.env('diffThreshold'),
          },
        });
      });
    });
  });
};

// these lifecycle hooks will be added to the user's Cypress suite
beforeEach(() => {
  setupNetworkListener();
});

afterEach(() => {
  completeArchive();
});
