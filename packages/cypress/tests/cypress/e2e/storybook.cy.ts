it('visits the test storybook page logged in', () => {
  cy.visit('http://localhost:6006/iframe.html?args=&id=example-page--logged-in&viewMode=story');
  cy.contains('Log out').should('be.visible');
});

it('visits the test storybook page logged out', () => {
  cy.visit('http://localhost:6006/iframe.html?args=&id=example-page--logged-out&viewMode=story');
  cy.contains('Log in').should('be.visible');
});
