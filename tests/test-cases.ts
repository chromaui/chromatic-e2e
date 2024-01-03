// these are used by both Playwright and Cypress.
// They're stored here to make sure we test the same things with both frameworks
// and don't get out of alignment on what we support
export const testCases = [
  {
    title: 'Asset Paths / query params determine which asset is served',
    path: 'asset-paths/query-params',
  },
  {
    title: 'Asset Paths / asset doesnt prevent directory from being created',
    path: 'asset-paths/asset-at-directory-name',
  },
  {
    title: 'Asset Paths / asset is found at relative path',
    path: 'asset-paths/relative-path',
  },
  {
    title: 'Asset Paths / long file names are allowed',
    path: 'asset-paths/long-file-name',
  },
  {
    title: 'Asset Paths / external asset is not archived (but still renders)',
    path: 'asset-paths/external-asset-not-archived',
  },
  {
    title: 'Asset Paths / external asset is archived',
    path: 'asset-paths/external-asset-archived',
  },
  {
    title: 'Asset Paths / assets from css urls are archived',
    path: 'asset-paths/css-urls',
  },
  {
    title: 'Asset Paths / percents in URLs are handled',
    path: 'asset-paths/percents',
  },
  {
    title: 'Asset Paths / srcset is used to determine image asset URL',
    path: 'asset-paths/srcset',
  },
  {
    title: 'Asset Paths / external CSS files are inlined',
    path: 'asset-paths/external-css-files',
  },
];
