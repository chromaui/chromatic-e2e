import type { TestType } from '@playwright/test';
import { createResourceArchive } from '../resource-archive';
import { writeTestResult } from '../write-archive';
import { contentType, takeSnapshot } from './takeSnapshot';

// We do this slightly odd thing (makeTest) to avoid importing playwright multiple times when
// linking this package. To avoid the main entry, you can:
//
//   import { makeTest } from '@chromaui/test-archiver/src/playwright-api/makeTest';
//   import { takeSnapshot as snapshot } from '@chromaui/test-archiver/src/playwright-api/takeSnapshot';
export const makeTest = (base: TestType<any, any>) =>
  base.extend<{ save: void }>({
    save: [
      async ({ page }, use, testInfo) => {
        const completeArchive = await createResourceArchive(page);
        await use();

        await takeSnapshot(page, testInfo);

        const resourceArchive = await completeArchive();

        const snapshots = Object.fromEntries(
          testInfo.attachments
            .filter((a) => a.contentType === contentType && !!a.body)
            .map(({ name, body }) => [name, body])
        ) as Record<string, Buffer>;

        await writeTestResult(testInfo.title, snapshots, resourceArchive);
      },
      { auto: true },
    ],
  });
