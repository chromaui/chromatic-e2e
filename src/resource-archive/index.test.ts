import dedent from 'ts-dedent';
import express, { type Request } from 'express';
import { Server } from 'http';
import { Browser, chromium, Page } from 'playwright';

import { createResourceArchive, type ResourceArchive } from './index';
import { expectArchiveContains } from '../utils/testUtils';
import { logger } from '../utils/logger';

const { TEST_PORT = 13337 } = process.env;

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

const styleCss = dedent`
  body {
    color: #999;
  }
`;

const imgPng =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const pathToResponseInfo = {
  '/': {
    content: ({ query: { inject = '' } }: Request) =>
      indexHtml.replace('</body>', `${[].concat(inject).map(decodeURIComponent).join('')}</body>`),
    mimeType: 'text/html',
  },
  '/style.css': {
    content: styleCss,
    mimeType: 'text/css',
  },
  '/img.png': {
    content: Buffer.from(imgPng, 'base64'),
    mimeType: 'image/png',
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

describe('new', () => {
  let browser: Browser;
  let page: Page;
  const mockWarn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  // eslint-disable-next-line jest/expect-expect
  it('should log if the network times out waiting for requests', async () => {
    const complete = await createResourceArchive(page, 1);

    await page.goto(baseUrl);

    // eslint-disable-next-line jest/valid-expect-in-promise
    await complete();

    expect(mockWarn).toBeCalledWith(`Global timeout of 1ms reached`);
  });

  // eslint-disable-next-line jest/expect-expect
  it('gathers basic resources used by the page', async () => {
    const complete = await createResourceArchive(page);

    await page.goto(baseUrl);

    const archive = await complete();

    expectArchiveContains(archive, ['/img.png', '/style.css'], pathToResponseInfo, baseUrl);
  });

  // eslint-disable-next-line jest/expect-expect
  it('ignores remote resources', async () => {
    const externalUrl =
      'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
    const indexPath = `/?inject=${encodeURIComponent(`<img src="${externalUrl}">`)}`;

    const complete = await createResourceArchive(page);

    await page.goto(new URL(indexPath, baseUrl).toString());

    const archive = await complete();

    expectArchiveContains(archive, ['/img.png', '/style.css'], pathToResponseInfo, baseUrl);
  });
});
