// @ts-nocheck
import { snapshot } from '@chromaui/rrweb-snapshot';

// Import commands.js using ES2015 syntax:
import './commands';

// these could go with before and afters, or more properly in a commands file... but that's an extra import
Cypress.Commands.add('takeChromaticArchive', () => {
  cy.document().then((doc) => {
    // here, handle the source map
    const snappy = snapshot(doc, { noAbsolute: true });
    // reassign manualSnapshots so it includes this new element
    cy.get('@manualSnapshots')
      .then((snappies) => {
        return [...snappies, snappy];
      })
      .as('manualSnapshots');
  });
});

// import our own custom commands

// Alternatively you can use CommonJS syntax:
// require('./commands')

const setupNetworkListener = () => {
  let pageUrl = '';
  cy.wrap({}).as('archive');
  cy.wrap([]).as('manualSnapshots');

  // since we don't know where the user will navigate, we'll archive whatever domain they're on first.
  // should be cross-browser
  cy.intercept(`**/*`, (req) => {
    // don't archive the page itself -- we'll do that with rrweb
    // TODO: See if this will work for both slash and not slash endings or if we have to do same "first URL visited" stuff
    if (!pageUrl) {
      pageUrl = new URL(req.url);
      return;
    }

    const url = new URL(req.url);
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
    req.continue((response) => {
      // console.log('response', response);
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
  cy.get('@archive').then((archive) => {
    // can we be sure this always fires after all the requests are back?
    cy.document().then((doc) => {
      // here, handle the source map
      const snap = snapshot(doc, { noAbsolute: true });
      cy.get('@manualSnapshots').then((manualSnapshots = []) => {
        // pass the snapshot to the server to write to disk
        cy.task('archiveCypress', {
          testTitle: Cypress.currentTest.title,
          domSnapshots: [...manualSnapshots, snap],
          resourceArchive: archive,
          chromaticStorybookParams: {
            diffThreshold: Cypress.env('diffThreshold'),
          },
        });
      });
    });
  });
};

// import the entire beforeEach and afterEach...
// https://github.com/cypress-io/code-coverage/blob/master/support.js
beforeEach(() => {
  setupNetworkListener();
});

afterEach(() => {
  completeArchive();
});
