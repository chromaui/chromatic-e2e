import { resolve } from 'path';
import { NodeType } from 'rrweb-snapshot';
import * as filePaths from '../utils/filePaths';
import { writeTestResult } from '.';

jest.mock('../utils/filePaths', () => ({
  ...jest.requireActual('../utils/filePaths'),
  ensureDir: jest.fn(),
  outputFile: jest.fn(),
  outputJSONFile: jest.fn(),
}));

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

afterEach(() => {
  jest.resetAllMocks();
});

describe('writeTestResult', () => {
  it('successfully generates test results', async () => {
    // @ts-expect-error Jest mock
    filePaths.ensureDir.mockReturnValue(true);
    await writeTestResult(
      // the default output directory in playwright
      {
        titlePath: ['file.spec.ts', 'Test Story'],
        outputDir: resolve('test-results'),
        pageUrl: 'http://localhost:3000/',
        viewport: { height: 800, width: 800 },
      },
      { home: Buffer.from(JSON.stringify(snapshotJson)) },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      {
        diffThreshold: 5,
        pauseAnimationAtEnd: true,
      }
    );
    expect(filePaths.ensureDir).toHaveBeenCalledTimes(1);
    expect(filePaths.outputFile).toHaveBeenCalledTimes(2);
    expect(filePaths.outputJSONFile).toHaveBeenCalledTimes(1);
    expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
      resolve('./test-results/chromatic-archives/file-test-story.stories.json'),
      {
        stories: [
          {
            name: 'home',
            parameters: {
              chromatic: { diffThreshold: 5, pauseAnimationAtEnd: true },
              server: { id: 'file-test-story-home' },
            },
          },
        ],
        title: 'file/Test Story',
      }
    );
  });

  it('successfully generates test results with mapped source entries', async () => {
    // @ts-expect-error Jest mock
    filePaths.ensureDir.mockReturnValue(true);

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
        titlePath: ['file.spec.ts', 'Toy Story'],
        outputDir: resolve('test-results'),
        pageUrl: 'http://localhost:3000/',
        viewport: { height: 800, width: 800 },
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
      {}
    );

    expect(filePaths.ensureDir).toHaveBeenCalledTimes(1);
    expect(filePaths.outputJSONFile).toHaveBeenCalledTimes(1);
    expect(filePaths.outputFile).toHaveBeenCalledTimes(3);
    expect(filePaths.outputFile).toHaveBeenCalledWith(
      resolve(
        './test-results/chromatic-archives/archive/file-toy-story-home.w800h800.snapshot.json'
      ),
      JSON.stringify(expectedMappedJson)
    );
  });

  it('stores archives in custom directory', async () => {
    // @ts-expect-error Jest mock
    filePaths.ensureDir.mockReturnValue(true);
    await writeTestResult(
      {
        titlePath: ['file.spec.ts', 'Test Story'],
        // simulates setting a custom output directory in Playwright
        outputDir: resolve('some-custom-directory/directory'),
        pageUrl: 'http://localhost:3000/',
        viewport: { height: 800, width: 800 },
      },
      { home: Buffer.from(JSON.stringify(snapshotJson)) },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      {}
    );
    expect(filePaths.ensureDir).toHaveBeenCalledTimes(1);
    expect(filePaths.outputFile).toHaveBeenCalledTimes(2);
    expect(filePaths.outputJSONFile).toHaveBeenCalledTimes(1);
    expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
      resolve('./some-custom-directory/directory/chromatic-archives/file-test-story.stories.json'),
      expect.anything()
    );
  });

  describe('smart story naming', () => {
    it('derives story title from test info, using all of the title path', async () => {
      // @ts-expect-error Jest mock
      filePaths.ensureDir.mockReturnValue(true);
      await writeTestResult(
        {
          titlePath: ['file.spec.ts', 'A grouping', 'Test Story'],
          outputDir: resolve('test-results'),
          pageUrl: 'http://localhost:3000/',
          viewport: { height: 800, width: 800 },
        },
        { home: Buffer.from(JSON.stringify(snapshotJson)) },
        { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
        {}
      );
      expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'file/A grouping/Test Story',
        })
      );
    });

    it('preserves dots in directories, describe blocks, and test titles', async () => {
      // @ts-expect-error Jest mock
      filePaths.ensureDir.mockReturnValue(true);
      await writeTestResult(
        {
          titlePath: [
            'a.directory/file.spec.ts',
            '.someFunction',
            '.someFunction() calls something',
          ],
          outputDir: resolve('test-results'),
          pageUrl: 'http://localhost:3000/',
          viewport: { height: 800, width: 800 },
        },
        { home: Buffer.from(JSON.stringify(snapshotJson)) },
        { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
        {}
      );
      expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'a.directory/file/.someFunction/.someFunction() calls something',
        })
      );
    });

    it('preserves dots in file name, besides file extension (Playwright)', async () => {
      // @ts-expect-error Jest mock
      filePaths.ensureDir.mockReturnValue(true);
      await writeTestResult(
        {
          titlePath: ['some.file.spec.ts', 'Test Story'],
          outputDir: resolve('test-results'),
          pageUrl: 'http://localhost:3000/',
          viewport: { height: 800, width: 800 },
        },
        { home: Buffer.from(JSON.stringify(snapshotJson)) },
        { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
        {}
      );
      expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'some.file/Test Story',
        })
      );
    });

    it('preserves dots in file name, besides file extension (Cypress)', async () => {
      // @ts-expect-error Jest mock
      filePaths.ensureDir.mockReturnValue(true);
      await writeTestResult(
        {
          titlePath: ['some.file.cy.ts', 'Test Story'],
          outputDir: resolve('test-results'),
          pageUrl: 'http://localhost:3000/',
          viewport: { height: 800, width: 800 },
        },
        { home: Buffer.from(JSON.stringify(snapshotJson)) },
        { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
        {}
      );
      expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'some.file/Test Story',
        })
      );
    });

    it('removes file extension, even if .spec or .cy are not used', async () => {
      // @ts-expect-error Jest mock
      filePaths.ensureDir.mockReturnValue(true);
      await writeTestResult(
        {
          titlePath: ['file.ts', 'Test Story'],
          outputDir: resolve('test-results'),
          pageUrl: 'http://localhost:3000/',
          viewport: { height: 800, width: 800 },
        },
        { home: Buffer.from(JSON.stringify(snapshotJson)) },
        { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
        {}
      );
      expect(filePaths.outputJSONFile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: 'file/Test Story',
        })
      );
    });
  });
});
