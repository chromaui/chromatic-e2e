import { testCases } from './../../test-cases';

// TODO: Remove when Cypress support achieves parity with Playwright
const skippedTestCases = [
  'Asset Paths / asset doesnt prevent directory from being created',
  'Asset Paths / percents in URLs are handled',
  'Asset Paths / external asset is archived',
  'Asset Paths / assets from css urls are archived',
];

describe('assets', () => {
  // add more tests
  testCases.forEach(({ title, path: urlPath }) => {
    if (skippedTestCases.includes(title)) {
      it.skip(title, () => {});
    } else {
      it(title, () => {
        if (title === 'Asset Paths / external asset is archived') {
          // mock the external image (which we'll archive)
          cy.intercept('https://some.external/domain/image.png', { fixture: 'pink.png' });
        }

        cy.visit(`http://localhost:3000/${urlPath}`);
      });
    }
  });
});
