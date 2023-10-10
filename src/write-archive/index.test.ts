import fs from 'fs-extra';
import { resolve } from 'path';
import type { TestInfo } from '@playwright/test';
import { writeTestResult } from '.';

jest.mock('fs-extra');
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
      { title: 'Test Story', outputDir: resolve('test-results/test-story-chromium') } as TestInfo,
      { home: Buffer.from('Chromatic') },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      { viewport: { height: 480, width: 720 } },
      new Map<string, string>()
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
              chromatic: { viewports: [720] },
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
    const storyJson = {
      childNodes: [
        {
          attributes: {
            src: '/bogano',
          },
        },
      ],
    };

    const expectedMappedJson = {
      childNodes: [
        {
          attributes: {
            src: '/coruscant',
          },
        },
      ],
    };

    const sourceMapping = new Map<string, string>();
    sourceMapping.set('/bogano', '/coruscant');

    const expectedBuffer = Buffer.from(JSON.stringify(expectedMappedJson));

    await writeTestResult(
      // the default output directory in playwright
      { title: 'Toy Story', outputDir: resolve('test-results/toy-story-chromium') } as TestInfo,
      { home: Buffer.from(JSON.stringify(storyJson)) },
      {
        'http://localhost:3000/home': {
          statusCode: 200,
          body: Buffer.from(JSON.stringify(storyJson)),
        },
      },
      { viewport: { height: 480, width: 720 } },
      sourceMapping
    );

    expect(fs.ensureDir).toHaveBeenCalledTimes(1);
    expect(fs.outputJson).toHaveBeenCalledTimes(1);
    expect(fs.outputFile).toHaveBeenCalledTimes(2);
    expect(fs.outputFile).toHaveBeenCalledWith(
      resolve('./test-results/chromatic-archives/archive/toy-story-home.snapshot.json'),
      expectedBuffer
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
      } as TestInfo,
      { home: Buffer.from('Chromatic') },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      { viewport: { height: 480, width: 720 } },
      new Map<string, string>()
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
