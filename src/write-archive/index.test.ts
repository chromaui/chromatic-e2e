import fs from 'fs-extra';
import { resolve } from 'path';
import { NodeType } from 'rrweb-snapshot';
import { writeTestResult } from '.';

jest.mock('fs-extra');

const snapshotJson = {
  childNodes: [
    {
      type: NodeType.Element,
      attributes: {
        src: 'http://localhost:3000/home/',
      },
    },
    {
      type: NodeType.Element,
      attributes: {
        src: 'http://localhost:3000/img?src=some-path',
      },
    },
  ],
};

describe('writeTestResult', () => {
  beforeEach(() => {
    fs.ensureDir.mockClear();
    fs.outputFile.mockClear();
    fs.outputJson.mockClear();
  });

  it('successfully generates test results', async () => {
    // @ts-expect-error Jest mock
    fs.ensureDir.mockReturnValue(true);
    await writeTestResult(
      // the default output directory in playwright
      {
        title: 'Test Story',
        outputDir: resolve('test-results/test-story-chromium'),
        pageUrl: 'http://localhost:3000/',
      },
      { home: Buffer.from(JSON.stringify(snapshotJson)) },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      {
        diffThreshold: 5,
        pauseAnimationAtEnd: true,
        viewports: [720],
      }
    );
    expect(fs.ensureDir).toHaveBeenCalledTimes(1);
    expect(fs.outputFile).toHaveBeenCalledTimes(2);
    expect(fs.outputJson).toHaveBeenCalledTimes(1);
    expect(fs.outputJson).toHaveBeenCalledWith(
      resolve('./test-results/chromatic-archives/test-story.stories.json'),
      {
        stories: [
          {
            name: 'home',
            parameters: {
              chromatic: { diffThreshold: 5, pauseAnimationAtEnd: true, viewports: [720] },
              server: { id: 'test-story-home.snapshot.json' },
            },
          },
        ],
        title: 'Test Story',
      }
    );
  });

  it('successfully generates test results with mapped source entries', async () => {
    // @ts-expect-error Jest mock
    fs.ensureDir.mockReturnValue(true);

    const expectedMappedJson = {
      childNodes: [
        {
          type: NodeType.Element,
          attributes: {
            src: '/home/index.html',
          },
        },
        {
          type: NodeType.Element,
          attributes: {
            src: '/img-fe2b41833610050d950fb9112407d3b3.png',
          },
        },
      ],
    };

    await writeTestResult(
      // the default output directory in playwright
      {
        title: 'Toy Story',
        outputDir: resolve('test-results/toy-story-chromium'),
        pageUrl: 'http://localhost:3000/',
      },
      { home: Buffer.from(JSON.stringify(snapshotJson)) },
      {
        'http://localhost:3000/home/': {
          statusCode: 200,
          body: Buffer.from(JSON.stringify(snapshotJson)),
        },
        'http://localhost:3000/img?src=some-path': {
          statusCode: 200,
          body: Buffer.from('image'),
          contentType: 'image/png',
        },
      },
      { viewports: [720] }
    );

    expect(fs.ensureDir).toHaveBeenCalledTimes(1);
    expect(fs.outputJson).toHaveBeenCalledTimes(1);
    expect(fs.outputFile).toHaveBeenCalledTimes(3);
    expect(fs.outputFile).toHaveBeenCalledWith(
      resolve('./test-results/chromatic-archives/archive/toy-story-home.snapshot.json'),
      JSON.stringify(expectedMappedJson)
    );
    expect(fs.outputJson).toHaveBeenCalledWith(
      resolve('./test-results/chromatic-archives/toy-story.stories.json'),
      {
        stories: [
          {
            name: 'home',
            parameters: {
              chromatic: { viewports: [720] },
              server: { id: 'toy-story-home.snapshot.json' },
            },
          },
        ],
        title: 'Toy Story',
      }
    );
  });

  it('stores archives in custom directory', async () => {
    // @ts-expect-error Jest mock
    fs.ensureDir.mockReturnValue(true);
    await writeTestResult(
      {
        title: 'Test Story',
        // simulates setting a custom output directory in Playwright
        outputDir: resolve('some-custom-directory/directory/test-story-chromium'),
        pageUrl: 'http://localhost:3000/',
      },
      { home: Buffer.from(JSON.stringify(snapshotJson)) },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      { viewports: [720] }
    );
    expect(fs.ensureDir).toHaveBeenCalledTimes(1);
    expect(fs.outputFile).toHaveBeenCalledTimes(2);
    expect(fs.outputJson).toHaveBeenCalledTimes(1);
    expect(fs.outputJson).toHaveBeenCalledWith(
      resolve('./some-custom-directory/directory/chromatic-archives/test-story.stories.json'),
      {
        stories: [
          {
            name: 'home',
            parameters: {
              chromatic: { viewports: [720] },
              server: { id: 'test-story-home.snapshot.json' },
            },
          },
        ],
        title: 'Test Story',
      }
    );
  });
});
