it('query params determine which asset is served', () => {
  cy.visit('/asset-paths/query-params');
});

it('asset doesnt prevent directory from being created', () => {
  cy.visit('/asset-paths/asset-at-directory-name');
});

it('asset is found at relative path', () => {
  cy.visit('/asset-paths/relative-path');
});

it('long file names are allowed', () => {
  cy.visit('/asset-paths/long-file-name');
});

it('external asset is not archived (but still renders)', () => {
  cy.visit('/asset-paths/external-asset-not-archived');
});

// TODO: Unskip when Cypress support achieves parity with Playwright
it.skip('external asset is archived', () => {
  // mock the external image (which we'll archive)
  cy.intercept('https://some.external/domain/image.png', { fixture: 'pink.png' });

  cy.visit('/asset-paths/external-asset-archived');
});

it('assets from css urls are archived', () => {
  cy.visit('/asset-paths/css-urls');
});

// TODO: Unskip when Cypress support achieves parity with Playwright
it.skip('percents in URLs are handled', () => {
  cy.visit('/asset-paths/percents');
});

it('srcset is used to determine image asset URL', () => {
  cy.visit('/asset-paths/srcset');
});

it('picture is captured', () => {
  cy.visit('/asset-paths/picture');
});

it('external CSS files are inlined', () => {
  cy.visit('/asset-paths/external-css-files');
});

it('video poster image is rendered', () => {
  cy.visit('/asset-paths/video-poster');
});

it('link tags for fonts preloads and other things are handled', () => {
  cy.visit('/asset-paths/link-tags');
});
