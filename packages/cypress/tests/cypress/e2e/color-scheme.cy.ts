afterEach(() => {
  // Reset the emulation so it doesn't leak into other spec files
  cy.wrap(null).then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [] },
    })
  );
});

describe('light color scheme', () => {
  it('renders the light-only content', () => {
    cy.wrap(null).then(() => setColorScheme('light'));
    cy.visit('/color-scheme');

    cy.contains('Only visible in LIGHT mode').should('be.visible');
    cy.contains('Only visible in DARK mode').should('not.be.visible');
  });
});

describe('dark color scheme', () => {
  it('renders the dark-only content', () => {
    cy.wrap(null).then(() => setColorScheme('dark'));
    cy.visit('/color-scheme');

    cy.contains('Only visible in DARK mode').should('be.visible');
    cy.contains('Only visible in LIGHT mode').should('not.be.visible');
  });
});

it(
  'captures both color schemes inside a single test case',
  { expose: { disableAutoSnapshot: true } },
  () => {
    cy.wrap(null).then(() => setColorScheme('dark'));
    cy.visit('/color-scheme');
    cy.contains('Only visible in DARK mode').should('be.visible');
    cy.takeSnapshot('dark');

    cy.wrap(null).then(() => setColorScheme('light'));
    cy.contains('Only visible in LIGHT mode').should('be.visible');
    cy.takeSnapshot('light');
  }
);

function setColorScheme(value: 'light' | 'dark') {
  return Cypress.automation('remote:debugger:protocol', {
    command: 'Emulation.setEmulatedMedia',
    params: { features: [{ name: 'prefers-color-scheme', value }] },
  });
}
