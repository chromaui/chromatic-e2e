import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChromaticStorybookParameters } from '../types';
import * as storiesFiles from './stories-files';

vi.mock('fs/promises');

const vports = [
  { width: 100, height: 1000 },
  { width: 1200, height: 100 },
  { width: 500, height: 500 },
];

beforeEach(() => {
  vi.resetAllMocks();
});

describe('storiesFileName', () => {
  it('sanitizes the file name', () => {
    const fileName = storiesFiles.storiesFileName('--a title *() with $%& chars---');
    expect(fileName).toEqual('a-title-with-chars.stories.json');
  });

  it('truncates long file names', () => {
    const title =
      'this title has 260 chars exactly i know because i counted and that is too big for a file system blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah blah ok this right here this is the end';
    expect(title.length).toBeGreaterThan(255);

    const fileName = storiesFiles.storiesFileName(title);
    expect(fileName.length).toEqual(230);
    expect(fileName).toMatch(new RegExp('^this-title-has-.*blah-bl[a-z0-9]{4}.stories.json$'));
  });

  it('replaces newlines with -', () => {
    const title = '\n\n\r\rThere\nShould\rBe\r\nNo\n\rNewlines\r\r\n\n';

    const filename = storiesFiles.storiesFileName(title);
    expect(filename).toEqual('there-should-be-no-newlines.stories.json');
  });
});

describe('createStories', () => {
  it('creates stories file JSON from DOM snapshots', () => {
    const title = 'some test title';
    const domSnapshots = {
      'snapshot 1': { snapshot: Buffer.from('n/a'), viewport: { width: 100, height: 200 } },
      'another snapshot': { snapshot: Buffer.from('n/a'), viewport: { width: 300, height: 400 } },
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
          globals: { viewport: 'w100h200' },
          parameters: {
            server: { id: 'some-test-title-snapshot-1' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
              modes: {
                w100h200: {
                  viewport: 'w100h200',
                },
              },
            },
            viewport: {
              defaultViewport: 'w100h200',
              options: {
                w100h200: {
                  name: 'w100h200',
                  type: 'mobile',
                  styles: {
                    height: '200px',
                    width: '100px',
                  },
                },
              },
            },
          },
        },
        {
          name: 'another snapshot',
          globals: { viewport: 'w300h400' },
          parameters: {
            server: { id: 'some-test-title-another-snapshot' },
            chromatic: {
              delay: 200,
              pauseAnimationAtEnd: true,
              modes: {
                w300h400: {
                  viewport: 'w300h400',
                },
              },
            },
            viewport: {
              defaultViewport: 'w300h400',
              options: {
                w300h400: {
                  name: 'w300h400',
                  type: 'mobile',
                  styles: {
                    height: '400px',
                    width: '300px',
                  },
                },
              },
            },
          },
        },
      ],
    });
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
        type: 'mobile',
        styles: {
          width: '100px',
          height: '1000px',
        },
      },
      w1200h100: {
        name: 'w1200h100',
        type: 'desktop',
        styles: {
          width: '1200px',
          height: '100px',
        },
      },
      w500h500: {
        name: 'w500h500',
        type: 'mobile',
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
