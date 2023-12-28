import { testCases } from './../../test-cases';

describe('assets', () => {
  // add more tests
  testCases.forEach(({ title, path: urlPath }) => {
    it(title, () => {
      if (title === 'external asset is archived') {
        // mock the external image (which we'll archive)
        cy.intercept('https://some.external/domain/image.png', { fixture: 'pink.png' });
      }

      cy.visit(`http://localhost:3000/${urlPath}`);
    });
  });
});
