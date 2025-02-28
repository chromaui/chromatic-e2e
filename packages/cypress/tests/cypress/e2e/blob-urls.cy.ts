it('Upload a Single file and Assert blob', { env: { ignoreSelectors: ['#objectUrl'] } }, () => {
  cy.visit('/blob-urls');

  cy.get('#fileInput').selectFile('../../../test-server/fixtures/blue.png');

  cy.get('#objectUrl')
    .invoke('text')
    .should('match', /blob:.*/);
});

it('Fetch data for blob', () => {
  cy.visit('/blob-urls?noUpload=true');

  cy.get('#blobImg')
    .should('be.visible')
    .should(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads
      expect($img[0].naturalWidth).to.eq(10);
    });
});

it(
  'Captures blob contents for manual snapshots',
  { env: { ignoreSelectors: ['#objectUrl'] } },
  () => {
    cy.visit('/blob-urls');

    cy.get('#fileInput').selectFile('../../../test-server/fixtures/blue.png');

    cy.get('#objectUrl')
      .invoke('text')
      .should('match', /blob:.*/);
    cy.takeSnapshot('Manual snapshot (Should show a blue square)');

    cy.visit('/asset-paths/query-params');
  }
);
