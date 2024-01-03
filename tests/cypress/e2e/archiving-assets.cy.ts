import { testCases } from './../../test-cases';

// TODO: Remove when Cypress support achieves parity with Playwright
const skippedTestCases = [
  'asset doesnt prevent directory from being created',
  'percents in URLs are handled',
];

describe('assets', () => {
  // add more tests
  testCases.forEach(({ title, path: urlPath }) => {
    if (skippedTestCases.includes(title)) {
      it.skip(title, () => {});
    } else {
      it(title, () => {
        if (title === 'external asset is archived') {
          // mock the external image (which we'll archive)
          cy.intercept('https://some.external/domain/image.png', { fixture: 'pink.png' });
        }

        cy.visit(`http://localhost:3000/${urlPath}`);
      });
    }
  });
});
