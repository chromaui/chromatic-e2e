import fs from 'fs/promises';
import { ChromaticStorybookParameters } from '../types';
import { Viewport } from '../utils/viewport';
import * as storiesFiles from './stories-files';

jest.mock('fs/promises');

const vports = [
  { width: 100, height: 1000 },
  { width: 1200, height: 100 },
  { width: 500, height: 500 },
];

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createStories', () => {
  it('creates stories file JSON from DOM snapshots', () => {
    const title = 'some test title';
    const domSnapshots = {
      'snapshot 1': Buffer.from('n/a'),
      'another snapshot': Buffer.from('n/a'),
    };
    const chromaticParams: ChromaticStorybookParameters = {
      delay: 200,
      pauseAnimationAtEnd: true,
    };

    const storiesFileJSON = storiesFiles.createStories(title, domSnapshots, chromaticParams);

    expect(storiesFileJSON).toEqual({
      title,
      stories: [
        {
          name: 'snapshot 1',
          parameters: {
            server: { id: 'some-test-title-snapshot-1' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
            },
          },
        },
        {
          name: 'another snapshot',
          parameters: {
            server: { id: 'some-test-title-another-snapshot' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
            },
          },
        },
      ],
    });
  });
});

describe('addViewportsToStories', () => {
  it('decorates stories JSON with viewport and modes story parameters', () => {
    const storiesFileJson = {
      title: 'some test title',
      stories: [
        {
          name: 'snapshot 1',
          parameters: {
            server: { id: 'some-test-title-snapshot-1' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
            },
          },
        },
        {
          name: 'another snapshot',
          parameters: {
            server: { id: 'some-test-title-another-snapshot' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
            },
          },
        },
      ],
    };

    const viewportsLookup: Record<string, Viewport[]> = {
      'some-test-title-snapshot-1': [
        { width: 500, height: 500 },
        { width: 1200, height: 700 },
      ],
      'some-test-title-another-snapshot': [{ width: 600, height: 600 }],
    };

    const storiesWithViewports = storiesFiles.addViewportsToStories(
      storiesFileJson,
      viewportsLookup
    );

    expect(storiesWithViewports).toEqual({
      title: 'some test title',
      stories: [
        {
          name: 'snapshot 1',
          parameters: {
            server: { id: 'some-test-title-snapshot-1' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
              modes: {
                w500h500: { viewport: 'w500h500' },
                w1200h700: { viewport: 'w1200h700' },
              },
            },
            viewport: {
              viewports: {
                w500h500: {
                  name: 'w500h500',
                  styles: { width: '500px', height: '500px' },
                },
                w1200h700: {
                  name: 'w1200h700',
                  styles: { width: '1200px', height: '700px' },
                },
              },
              defaultViewport: 'w1200h700',
            },
          },
        },
        {
          name: 'another snapshot',
          parameters: {
            server: { id: 'some-test-title-another-snapshot' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
              modes: {
                w600h600: { viewport: 'w600h600' },
              },
            },
            viewport: {
              viewports: {
                w600h600: {
                  name: 'w600h600',
                  styles: { width: '600px', height: '600px' },
                },
              },
              defaultViewport: 'w600h600',
            },
          },
        },
      ],
    });
  });
});

describe('listStoriesFiles', () => {
  it('lists stories files in a given directory', async () => {
    const allFiles = [
      'some-id.stories.json',
      'not-a-snap.txt',
      'some-id.stories.json',
      'not-a-snapshot.json',
    ];
    fs.readdir = jest.fn().mockResolvedValueOnce(allFiles);
    const files = await storiesFiles.listStoriesFiles('some-dir');

    expect(files).toEqual(['some-id.stories.json', 'some-id.stories.json']);
  });
});

describe('buildStoryModesConfig', () => {
  it('builds viewports config for storybook parameters', () => {
    const viewportsConfig = storiesFiles.buildStoryModesConfig(vports);
    expect(viewportsConfig).toEqual({
      w100h1000: { viewport: 'w100h1000' },
      w1200h100: { viewport: 'w1200h100' },
      w500h500: { viewport: 'w500h500' },
    });
  });
});

describe('buildStoryViewportsConfig', () => {
  it('builds viewports config for storybook parameters', () => {
    const viewportsConfig = storiesFiles.buildStoryViewportsConfig(vports);
    expect(viewportsConfig).toEqual({
      w100h1000: {
        name: 'w100h1000',
        styles: {
          width: '100px',
          height: '1000px',
        },
      },
      w1200h100: {
        name: 'w1200h100',
        styles: {
          width: '1200px',
          height: '100px',
        },
      },
      w500h500: {
        name: 'w500h500',
        styles: {
          width: '500px',
          height: '500px',
        },
      },
    });
  });
});

describe('findDefaultViewport', () => {
  it('returns the default viewport given a list', () => {
    const defaultViewport = storiesFiles.findDefaultViewport(vports);
    expect(defaultViewport).toEqual({ width: 1200, height: 100 });
  });
});
