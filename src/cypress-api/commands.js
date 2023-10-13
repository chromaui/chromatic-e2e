import { snapshot } from '@chromaui/rrweb-snapshot';

Cypress.Commands.add('takeChromaticSnapshot', () => {
  cy.window().then((win) => {
    // can we be sure this always fires after all the requests are back?
    cy.document().then((doc) => {
      const snap = snapshot(doc, { noAbsolute: true });
      // pass the snapshot to the server to write to disk
      cy.task('passSnapshot', snap);
    });
  });
});

Cypress.Commands.add('archiveResources', (pageUrl) => {
  const archive = {};

  cy.intercept(`${pageUrl}**/*`, (req) => {
    // don't archive the page itself -- we'll do that with rrweb
    // TODO: See if this will work for both slash and not slash endings or if we have to do same "first URL visited" stuff
    if (req.url === pageUrl) {
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
      archive[response.url] = {
        statusCode: response.statusCode,
        statusText: response.statusMessage,
        // TODO: check if body is base64 encoded?
        body: Buffer.from(response.body, 'utf8'),
      };
    });
  });
});
