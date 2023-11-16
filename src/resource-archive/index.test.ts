import dedent from 'ts-dedent';
import express, { type Request } from 'express';
import { Server } from 'http';
import { Browser, chromium, Page } from 'playwright';

import { createResourceArchive } from './index';
import { logger } from '../utils/logger';

const TEST_PORT = 13337;

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

// stubbed external imgs so we're not relying on a placeholder
const externalImgPng = 'iamexternal';
const anotherExternalImg = 'anotherone';

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
    // create a bare-bones Playwright test launch (https://playwright.dev/docs/library)
    browser = await chromium.launch();
    page = await browser.newPage();

    // mock external image requests
    await page.route('https://i-ama.fake/external/domain/image.png', async (route) => {
      await route.fulfill({ body: Buffer.from(externalImgPng, 'base64') });
    });

    await page.route('https://another-domain.com/picture.png', async (route) => {
      await route.fulfill({ body: Buffer.from(anotherExternalImg, 'base64') });
    });

    await page.route('https://unwanted-domain.com/img.png', async (route) => {
      await route.fulfill({ body: Buffer.from(anotherExternalImg, 'base64') });
    });
  });

  afterEach(async () => {
    await browser.close();
  });

  it('should log if the network times out waiting for requests', async () => {
    const complete = await createResourceArchive({ page, networkTimeout: 1 });

    await page.goto(baseUrl);

    // eslint-disable-next-line jest/valid-expect-in-promise
    await complete();

    expect(mockWarn).toBeCalledWith(`Global timeout of 1ms reached`);
  });

  it('gathers basic resources used by the page', async () => {
    const complete = await createResourceArchive({ page });

    await page.goto(baseUrl);

    const archive = await complete();

    expect(archive).toEqual({
      'http://localhost:13337/style.css': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(styleCss),
        contentType: 'text/css; charset=utf-8',
      },
      'http://localhost:13337/img.png': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(imgPng, 'base64'),
        contentType: undefined,
      },
    });
  });

  it('ignores remote resources', async () => {
    const externalUrl = 'https://i-ama.fake/external/domain/image.png';
    const indexPath = `/?inject=${encodeURIComponent(`<img src="${externalUrl}">`)}`;

    const complete = await createResourceArchive({ page });

    await page.goto(new URL(indexPath, baseUrl).toString());

    const archive = await complete();

    expect(archive).toEqual({
      'http://localhost:13337/style.css': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(styleCss),
        contentType: 'text/css; charset=utf-8',
      },
      'http://localhost:13337/img.png': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(imgPng, 'base64'),
        contentType: undefined,
      },
    });
  });

  it('includes remote resource when told to', async () => {
    const externalUrls = [
      'https://i-ama.fake/external/domain/image.png',
      'https://another-domain.com/picture.png',
      // this image won't be in allow-list
      'https://unwanted-domain.com/img.png',
    ];
    const indexPath = `/?inject=${encodeURIComponent(
      externalUrls.map((url) => `<img src="${url}">`).join()
    )}`;

    const complete = await createResourceArchive({
      page,
      allowedArchiveDomains: [
        // external origins we allow-list
        'https://i-ama.fake',
        'https://another-domain.com',
      ],
    });

    await page.goto(new URL(indexPath, baseUrl).toString());

    const archive = await complete();

    expect(archive).toEqual({
      'http://localhost:13337/style.css': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(styleCss),
        contentType: 'text/css; charset=utf-8',
      },
      'http://localhost:13337/img.png': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(imgPng, 'base64'),
        contentType: undefined,
      },
      // includes cross-origin images
      'https://i-ama.fake/external/domain/image.png': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(externalImgPng, 'base64'),
        contentType: undefined,
      },
      'https://another-domain.com/picture.png': {
        statusCode: 200,
        statusText: 'OK',
        body: Buffer.from(anotherExternalImg, 'base64'),
        contentType: undefined,
      },
    });
  });
});
