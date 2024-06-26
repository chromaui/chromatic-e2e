it('visits hosted storybook page', () => {
  cy.visit(
    'https://main--653fef099b8957739e7534a4.chromatic.com/iframe.html?globals=viewport:w1280h720&id=options-pause-animation-at-end--snapshot-1&viewMode=story'
  );
  cy.contains('The image').should('be.visible');
});
