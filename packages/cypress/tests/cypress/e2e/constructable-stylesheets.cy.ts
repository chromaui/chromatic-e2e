it('styles render in plain html', () => {
  cy.visit('/constructable-stylesheets/plain');
});

it('styles render in shadow dom elements', () => {
  cy.visit('/constructable-stylesheets/shadow-dom');
});

it('styles render in web components', () => {
  cy.visit('/constructable-stylesheets/web-components');
});

it('styles render in web components in shadow dom', () => {
  cy.visit('/constructable-stylesheets/web-components-shadow-dom');
});
