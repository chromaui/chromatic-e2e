import fs from 'fs-extra';
import { resolve } from 'path';
import { writeTestResult } from '.';

jest.mock('fs-extra');
describe('writeTestResult', () => {
  beforeEach(() => {
    const mockedDate = new Date(1999, 10, 1);

    jest.useFakeTimers('modern');
    jest.setSystemTime(mockedDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });
  it('successfully generates test results', async () => {
    // @ts-expect-error Jest mock
    fs.ensureDir.mockReturnValue(true);
    await writeTestResult(
      { title: 'Test Story', outputDir: resolve('test-results/test-story-chromium') },
      { home: Buffer.from('Chromatic') },
      { 'http://localhost:3000/home': { statusCode: 200, body: Buffer.from('Chromatic') } },
      { viewport: { height: 480, width: 720 } }
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
});
