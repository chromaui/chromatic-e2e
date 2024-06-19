import { TestInfo } from 'playwright/test';
import { Browser, chromium, Page } from 'playwright';
import { performChromaticSnapshot } from './makeTest';
import { chromaticSnapshots, takeSnapshot } from './takeSnapshot';

// mock the tracking as it causes memory leak in test
jest.mock('@chromatic-com/shared-e2e', () => ({
  ...jest.requireActual('@chromatic-com/shared-e2e'),
  trackComplete: jest.fn(),
  trackRun: jest.fn(),
}));

describe('makeTest', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    // create a bare-bones Playwright test launch (https://playwright.dev/docs/library)
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  const mockTestInfo: Partial<TestInfo> = {
    titlePath: [],
    outputDir: '',
  };

  it('Removes the entry from the snapshots after test is done', async () => {
    expect(chromaticSnapshots.size).toBe(0);
    await performChromaticSnapshot(
      { page },
      async () => {
        // do-nothing test() function
      },
      // @ts-expect-error mockTestInfo doesn't try to have all the TestInfo fields. I didn't see a way of deriving testInfo
      // from the page/browser itself (typically that comes as part of the Playwright test runner, which we're outside of here)
      mockTestInfo
    );
    expect(chromaticSnapshots.size).toBe(0);
  });

  it('Removes entry even if test fails', async () => {
    expect(chromaticSnapshots.size).toBe(0);
    // make sure we still throw the original error (we don't want to swallow errors from the user's test)
    await expect(
      performChromaticSnapshot(
        { page },
        async () => {
          // @ts-expect-error mockTestInfo doesn't try to have all TestInfo fields
          await takeSnapshot(page, mockTestInfo);
          throw new Error('Something is wrong');
        },
        // @ts-expect-error mockTestInfo doesn't try to have all TestInfo fields
        mockTestInfo
      )
    ).rejects.toThrow('Something is wrong');
    // make sure we still remove the entry even if performChromaticSnapshot encounters an error
    expect(chromaticSnapshots.size).toBe(0);
  });
});
