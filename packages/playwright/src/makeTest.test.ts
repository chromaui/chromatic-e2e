import { dedent } from 'ts-dedent';
import express, { type Request } from 'express';
import { Server } from 'http';
import { Browser, chromium, devices, Page } from 'playwright';

import { chromaticSnapshots, takeSnapshot } from './takeSnapshot';
import { TestInfo } from 'playwright/test';

const TEST_PORT = 13339;

const baseUrl = `http://localhost:${TEST_PORT}`;

const indexHtml = dedent`
  <html>
    <head>
      <link rel="stylesheet" href="style.css">
    </head>
    <body>
      <img src="img.png" >
    </body>
  </html>
`;

const pathToResponseInfo = {
  '/': {
    content: ({ query: { inject = '' } }: Request) =>
      indexHtml.replace('</body>', `${[].concat(inject).map(decodeURIComponent).join('')}</body>`),
    mimeType: 'text/html',
  },
} as const;

let app: ReturnType<typeof express>;
let server: Server;
beforeEach(async () => {
  app = express();

  Object.entries(pathToResponseInfo).forEach(([path, responseInfo]) => {
    app.get(path, (req, res) => {
      const { content, mimeType } = responseInfo;
      res.header('content-type', mimeType);
      res.send(typeof content === 'function' ? content(req) : content);
    });
  });

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => resolve(null));
  });
});

afterEach(async () => {
  await server.close();
});

describe('Snapshot storage', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    // create a bare-bones Playwright test launch (https://playwright.dev/docs/library)
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('creates an entry (test name and snapshot buffer) when a snapshot is taken', async () => {
    expect(chromaticSnapshots).toEqual({});

    await page.goto(baseUrl);

    // not ideal to mock testInfo, but AFAIK we can't get testInfo when using Playwright library instead of Playwright test runner.
    const fakeTestInfo = { testId: 'a' };
    await takeSnapshot(page, fakeTestInfo as TestInfo);

    expect(chromaticSnapshots['a']).toMatchObject({ ['Snapshot #1']: {} });
    // I guess we should test the buffer's value here...
    expect(Buffer.isBuffer(chromaticSnapshots['a']['Snapshot #1'])).toBe(true);
  });
});
