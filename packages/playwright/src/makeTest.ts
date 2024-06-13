import type {
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test';
import type { ChromaticConfig } from '@chromatic-com/shared-e2e';
import {
  writeTestResult,
  trackComplete,
  trackRun,
  DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
} from '@chromatic-com/shared-e2e';
import { chromaticSnapshots, takeSnapshot } from './takeSnapshot';
import { createResourceArchive } from './createResourceArchive';

// We do this slightly odd thing (makeTest) to avoid importing playwright multiple times when
// linking this package. To avoid the main entry, you can:
//
//   import { makeTest } from '@chromaui/test-archiver/src/playwright-api/makeTest';
//   import { takeSnapshot as snapshot } from '@chromaui/test-archiver/src/playwright-api/takeSnapshot';
export const makeTest = (
  base: TestType<
    PlaywrightTestArgs & PlaywrightTestOptions,
    PlaywrightWorkerArgs & PlaywrightWorkerOptions
  >
) =>
  base.extend<ChromaticConfig & { chromaticSnapshot: void }>({
    // ChromaticConfig defaults
    delay: [undefined, { option: true }],
    diffIncludeAntiAliasing: [undefined, { option: true }],
    diffThreshold: [undefined, { option: true }],
    disableAutoSnapshot: [false, { option: true }],
    forcedColors: [undefined, { option: true }],
    pauseAnimationAtEnd: [undefined, { option: true }],
    prefersReducedMotion: [undefined, { option: true }],
    resourceArchiveTimeout: [DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS, { option: true }],
    assetDomains: [[], { option: true }],
    cropToViewport: [undefined, { option: true }],

    chromaticSnapshot: [
      async (
        {
          page,
          delay,
          diffIncludeAntiAliasing,
          diffThreshold,
          disableAutoSnapshot,
          forcedColors,
          pauseAnimationAtEnd,
          prefersReducedMotion,
          resourceArchiveTimeout,
          assetDomains,
          cropToViewport,
        },
        use,
        testInfo
      ) => {
        trackRun();

        // CDP only works in Chromium, so we only capture archives in Chromium.
        // We can later snapshot them in different browsers in the cloud.
        // TODO: I'm not sure if this is the best way to detect the browser version, but
        // it seems to work
        if (page.context().browser().browserType().name() !== 'chromium') {
          await use();
          return;
        }

        const completeArchive = await createResourceArchive({
          page,
          networkTimeout: resourceArchiveTimeout,
          assetDomains,
        });
        await use();

        if (!disableAutoSnapshot) {
          await takeSnapshot(page, testInfo);
        }

        const resourceArchive = await completeArchive();
        const testId = testInfo.testId;
        const snapshots = chromaticSnapshots[testId] || {};

        const chromaticStorybookParams = {
          ...(delay && { delay }),
          ...(diffIncludeAntiAliasing && { diffIncludeAntiAliasing }),
          ...(diffThreshold && { diffThreshold }),
          ...(forcedColors && { forcedColors }),
          ...(pauseAnimationAtEnd && { pauseAnimationAtEnd }),
          ...(prefersReducedMotion && { prefersReducedMotion }),
          ...(cropToViewport && { cropToViewport }),
        };

        await writeTestResult(
          { ...testInfo, pageUrl: page.url(), viewport: page.viewportSize() },
          snapshots,
          resourceArchive,
          chromaticStorybookParams
        );

        trackComplete();

        delete chromaticSnapshots[testId];
      },
      { auto: true },
    ],
  });
