type Point = { x: number; y: number };

it('captures :hover state', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/css-pseudo-states');
  withElementCenter('button#target', mouseMove);

  cy.get('button#target:hover').should('exist');
  cy.takeSnapshot('hover');
});

it('captures :focus state', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/css-pseudo-states');

  withElementCenter('button#target', (point) =>
    mouseMove(point)
      .then(() => mouseDown(point))
      .then(() => mouseUp(point))
  );

  cy.get('button#target:focus').should('exist');
  cy.takeSnapshot('focus');
});

it('captures :active state', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/css-pseudo-states');

  let pressedCoords: Point = { x: 0, y: 0 };

  withElementCenter('button#target', (point) =>
    mouseMove(point)
      .then(() => mouseDown(point))
      .then(() => {
        pressedCoords = point;
      })
  );

  cy.get('button#target:active').should('exist');
  cy.takeSnapshot('active');

  cy.then(() => mouseUp(pressedCoords));
});

it('captures :focus-visible state', { env: { disableAutoSnapshot: true } }, () => {
  cy.visit('/css-pseudo-states');
  cy.get('button#tab-cycle').focus();

  cy.wrap(null).then(keyboardTab);

  cy.get('button#target:focus-visible').should('exist');
  cy.takeSnapshot('focus-visible');
});

function cdp(command: string, params: Record<string, unknown>) {
  return Cypress.automation('remote:debugger:protocol', { command, params });
}

function getCdpElementCenter(el: HTMLElement): Point {
  const rect = el.getBoundingClientRect();
  const autWindow = el.ownerDocument.defaultView!;

  if (autWindow === autWindow.top) {
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  }

  const autIframe = [...autWindow.parent.document.querySelectorAll('iframe')].find(
    (frame) => frame.contentWindow === autWindow
  );

  if (!autIframe) {
    return {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    };
  }

  const iframeRect = autIframe.getBoundingClientRect();
  const frameScale = autIframe.offsetWidth ? iframeRect.width / autIframe.offsetWidth : 1;

  return {
    x: Math.round(iframeRect.left + rect.left * frameScale + (rect.width * frameScale) / 2),
    y: Math.round(iframeRect.top + rect.top * frameScale + (rect.height * frameScale) / 2),
  };
}

function withElementCenter(selector: string, cb: (point: Point) => Promise<unknown>) {
  return cy.get(selector).then(($el) => cb(getCdpElementCenter($el[0])));
}

function mouseMove(point: Point) {
  return cdp('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: point.x,
    y: point.y,
    button: 'none',
    pointerType: 'mouse',
  });
}

function mouseDown(point: Point) {
  return cdp('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
    pointerType: 'mouse',
  });
}

function mouseUp(point: Point) {
  return cdp('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: point.x,
    y: point.y,
    button: 'left',
    buttons: 0,
    clickCount: 1,
    pointerType: 'mouse',
  });
}

function keyboardTab() {
  return cdp('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    windowsVirtualKeyCode: 9,
    key: 'Tab',
    code: 'Tab',
  }).then(() =>
    cdp('Input.dispatchKeyEvent', {
      type: 'keyUp',
      windowsVirtualKeyCode: 9,
      key: 'Tab',
      code: 'Tab',
    })
  );
}
