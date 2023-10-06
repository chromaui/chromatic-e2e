import type {
  TestType,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
} from '@playwright/test';
import { createResourceArchive } from '../resource-archive';
import { writeTestResult } from '../write-archive';
import { contentType, takeArchive } from './takeArchive';
import { trackComplete, trackRun } from '../utils/analytics';

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
  base.extend<{ save: void }>({
    save: [
      async ({ page }, use, testInfo) => {
        trackRun();

        // CDP only works in Chromium, so we only capture archives in Chromium.
        // We can later snapshot them in different browsers in the cloud.
        // TODO: I'm not sure if this is the best way to detect the browser version, but
        // it seems to work
        if (page.context().browser().browserType().name() !== 'chromium') {
          await use();
          return;
        }

        const completeArchive = await createResourceArchive(page);
        await use();

        await takeArchive(page, testInfo);

        const resourceArchive = await completeArchive();

        const snapshots = Object.fromEntries(
          testInfo.attachments
            .filter((a) => a.contentType === contentType && !!a.body)
            .map(({ name, body }) => [name, body])
        ) as Record<string, Buffer>;

        const viewport = page.viewportSize();

        await writeTestResult(testInfo, snapshots, resourceArchive, { viewport });

        trackComplete();
      },
      { auto: true },
    ],
  });
