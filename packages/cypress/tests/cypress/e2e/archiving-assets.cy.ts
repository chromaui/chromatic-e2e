it('Assets / query params determine which asset is served', () => {
  cy.visit('/asset-paths/query-params');
});

it('Assets / asset doesnt prevent directory from being created', () => {
  cy.visit('/asset-paths/asset-at-directory-name');
});

it('Assets / asset is found at relative path', () => {
  cy.visit('/asset-paths/relative-path');
});

it('Assets / long file names are allowed', () => {
  cy.visit('/asset-paths/long-file-name');
});

it('Assets / external asset is not archived (but still renders)', () => {
  cy.visit('/asset-paths/external-asset-not-archived');
});

it('Assets / external asset is archived', { env: { assetDomains: ['some.external'] } }, () => {
  // mock the external image (which we'll archive)
  cy.intercept('https://some.external/domain/image.png', { fixture: 'pink.png' });

  cy.visit('/asset-paths/external-asset-archived');
});

it('Assets / assets from css urls are archived', () => {
  cy.visit('/asset-paths/css-urls');
});

// TODO: Unskip when Cypress support achieves parity with Playwright
it.skip('Assets / percents in URLs are handled', () => {
  cy.visit('/asset-paths/percents');
});

it('Assets / srcset is used to determine image asset URL', () => {
  cy.visit('/asset-paths/srcset');
});

it('Assets / external CSS files are inlined', () => {
  cy.visit('/asset-paths/external-css-files');
});

it('Assets / video poster image is rendered', () => {
  cy.visit('/asset-paths/video-poster');
});
