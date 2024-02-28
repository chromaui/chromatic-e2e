import fs from 'fs-extra';
import { addViewportsToStoriesFiles } from './viewports';
import * as snapshots from '../write-archive/snapshot-files';
import * as stories from '../write-archive/stories-files';

jest.mock('fs-extra');

const mockSnapshotFiles = [
  'some-test-snapshot-1.w500h500.snapshot.json',
  'some-test-snapshot-1.w1200h700.snapshot.json',
];
const mockStoriesFiles = ['some-test.stories.json'];
const mockStoriesFileJson = {
  title: 'some test',
  stories: [
    {
      name: 'snapshot 1',
      parameters: {
        server: { id: 'some-test-snapshot-1' },
        chromatic: {
          delay: 200,
          pauseAnimationAtEnd: true,
        },
      },
    },
  ],
};

afterEach(() => {
  jest.resetAllMocks();
  jest.restoreAllMocks();
});

describe('addViewportsToStoriesFiles', () => {
  it('adds snapshot viewports to stories files', async () => {
    jest.spyOn(snapshots, 'listSnapshotFiles').mockResolvedValueOnce(mockSnapshotFiles);
    jest.spyOn(stories, 'listStoriesFiles').mockResolvedValueOnce(mockStoriesFiles);
    (fs.readJSON as jest.Mock).mockResolvedValueOnce(mockStoriesFileJson);

    await addViewportsToStoriesFiles('test-archives');

    expect(fs.outputJSON).toHaveBeenCalledWith(expect.stringContaining('some-test.stories.json'), {
      title: 'some test',
      stories: [
        {
          name: 'snapshot 1',
          parameters: {
            server: { id: 'some-test-snapshot-1' },
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
      ],
    });
  });
});
