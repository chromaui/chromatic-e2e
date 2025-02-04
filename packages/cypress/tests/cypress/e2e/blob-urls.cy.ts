it('Upload a Single file and Assert blob', () => {
  cy.visit('/createObjectUrl');

  cy.get('#fileInput').selectFile('../../../test-server/fixtures/blue.png');

  cy.get('#objectUrl')
    .invoke('text')
    .should('match', /blob:.*/);
});

it('Fetch data for blob', () => {
  cy.visit('/createObjectUrl?noUpload=true');

  // probably can just do this part?

  cy.get('#blobImg')
    .should('be.visible')
    .should(($img) => {
      // "naturalWidth" and "naturalHeight" are set when the image loads
      expect($img[0].naturalWidth).to.eq(10);
    });
});
