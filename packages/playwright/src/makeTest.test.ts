import { TestInfo } from 'playwright/test';
import { Browser, chromium, Page } from 'playwright';
import { performChromaticSnapshot } from './makeTest';
import { chromaticSnapshots } from './takeSnapshot';

// mock the tracking as it causes memory leak in test
jest.mock('@chromatic-com/shared-e2e', () => ({
  ...jest.requireActual('@chromatic-com/shared-e2e'),
  trackComplete: () => {},
  trackRun: () => {},
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
  });

  it('Removes the entry from the snapshots after test is done', async () => {
    const mockTestInfo: Partial<TestInfo> = {
      titlePath: [],
      outputDir: '',
    };

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
});
