import type {
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test';
import type { ChromaticConfig } from '@chromaui/shared-e2e';
import {
  writeTestResult,
  trackComplete,
  trackRun,
  DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
} from '@chromaui/shared-e2e';
import { contentType, takeSnapshot } from './takeSnapshot';
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
  base.extend<ChromaticConfig & { save: void }>({
    // ChromaticConfig defaults
    delay: [undefined, { option: true }],
    diffIncludeAntiAliasing: [undefined, { option: true }],
    diffThreshold: [undefined, { option: true }],
    disableAutoCapture: [false, { option: true }],
    forcedColors: [undefined, { option: true }],
    pauseAnimationAtEnd: [undefined, { option: true }],
    prefersReducedMotion: [undefined, { option: true }],
    resourceArchiveTimeout: [DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS, { option: true }],
    allowedArchiveDomains: [[], { option: true }],

    save: [
      async (
        {
          page,
          delay,
          diffIncludeAntiAliasing,
          diffThreshold,
          disableAutoCapture,
          forcedColors,
          pauseAnimationAtEnd,
          prefersReducedMotion,
          resourceArchiveTimeout,
          allowedArchiveDomains,
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
          allowedArchiveDomains,
        });
        await use();

        if (!disableAutoCapture) {
          await takeSnapshot(page, testInfo);
        }

        const resourceArchive = await completeArchive();

        const snapshots = Object.fromEntries(
          testInfo.attachments
            .filter((a) => a.contentType === contentType && !!a.body)
            .map(({ name, body }) => [name, body])
        ) as Record<string, Buffer>;

        const chromaticStorybookParams = {
          ...(delay && { delay }),
          ...(diffIncludeAntiAliasing && { diffIncludeAntiAliasing }),
          ...(diffThreshold && { diffThreshold }),
          ...(forcedColors && { forcedColors }),
          ...(pauseAnimationAtEnd && { pauseAnimationAtEnd }),
          ...(prefersReducedMotion && { prefersReducedMotion }),
          viewports: [page.viewportSize().width],
        };

        await writeTestResult(
          { ...testInfo, pageUrl: page.url() },
          snapshots,
          resourceArchive,
          chromaticStorybookParams
        );

        trackComplete();
      },
      { auto: true },
    ],
  });
