import type {
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test';
import type { ChromaticConfig, ChromaticStorybookParameters } from '../types';
import { createResourceArchive } from '../resource-archive';
import { writeTestResult } from '../write-archive';
import { contentType, takeArchive } from './takeArchive';
import { trackComplete, trackRun } from '../utils/analytics';
import { DEFAULT_GLOBAL_NETWORK_TIMEOUT_MS } from '../constants';

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
          networkTimeout,
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

        const completeArchive = await createResourceArchive(page, networkTimeout);
        await use();

        let sourceMap;
        if (!disableAutoCapture) {
          sourceMap = await takeArchive(page, testInfo);
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
          testInfo,
          snapshots,
          resourceArchive,
          chromaticStorybookParams,
          sourceMap
        );

        trackComplete();
      },
      { auto: true },
    ],
  });
