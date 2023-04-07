import dedent from 'ts-dedent';
import express from 'express';
import { Server } from 'http';
import { Browser, chromium, Page } from 'playwright';

import { createResourceArchive } from './index';

const { TEST_PORT = 13337 } = process.env;

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
    content: indexHtml,
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
      res.send(content);
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
  beforeEach(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('gathers basic resources used by the page', async () => {
    const url = `http://localhost:${TEST_PORT}`;

    const complete = await createResourceArchive(page);

    await page.goto(url);

    const archive = await complete();

    const expectedPaths = ['/', '/img.png', '/style.css'] as const;
    const foundPaths = Object.keys(archive);

    for (const path of expectedPaths) {
      expect(foundPaths).toContain(`${url}${path}`);

      expect(archive[`${url}${path}`].body?.toString('base64')).toEqual(
        Buffer.from(pathToResponseInfo[path].content).toString('base64')
      );
    }
  });
});
