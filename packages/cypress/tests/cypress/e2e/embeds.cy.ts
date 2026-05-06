it('same-origin embed page loads', () => {
  cy.visit('/embeds/same-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Same-origin iframe"]').should('be.visible');
});

it('cross-origin embed page loads', () => {
  cy.visit('/embeds/cross-origin');
  cy.contains('h1', 'Embeds').should('be.visible');
  cy.get('iframe[title="Cross-origin iframe"]').should('be.visible');
  cy.request('http://localhost:3001/').its('body').should('include', 'Embedded page');
});

it('embedded page background color can be changed', { env: { disableAutoSnapshot: true } }, () => {
  /** Re-query each time; wait until iframe document + body exist (load can lag after parent paint). */
  const inEmbeddedBody = (fn: () => void) => {
    cy.get('iframe[title="Same-origin iframe"]')
      .should(($iframe) => {
        const el = $iframe[0] as HTMLIFrameElement;
        const body = el.contentDocument?.body;
        expect(body, 'iframe body').to.not.equal(null);
        expect(body!.querySelector('h1')?.textContent).to.include('Embedded page');
      })
      .then(($iframe) => {
        const body = ($iframe[0] as HTMLIFrameElement).contentDocument!.body;
        cy.wrap(body).within(fn);
      });
  };

  cy.visit('/embeds/same-origin');
  cy.contains('h1', 'Embeds').should('be.visible');

  inEmbeddedBody(() => {
    cy.contains('h1', 'Embedded page').should('be.visible');
    cy.contains('button', 'Red').click();
    cy.root().should('have.css', 'background-color', 'rgb(255, 0, 0)');
  });
  cy.takeSnapshot('Red background');

  inEmbeddedBody(() => {
    cy.contains('button', 'Yellow').click();
    cy.root().should('have.css', 'background-color', 'rgb(255, 255, 0)');
  });
  cy.takeSnapshot('Yellow background');

  inEmbeddedBody(() => {
    cy.contains('button', 'Blue').click();
    cy.root().should('have.css', 'background-color', 'rgb(0, 0, 255)');
  });
  cy.takeSnapshot('Blue background');

  inEmbeddedBody(() => {
    cy.contains('button', 'Reset').click();
    cy.root().should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
  });
  cy.takeSnapshot('Reset background');
});
