import type { Page } from 'playwright';
import { Watcher, ResourceArchive } from '../resource-archive';
import { DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS } from '../constants';

export const createResourceArchive = async ({
  page,
  networkTimeout,
  allowedArchiveDomains,
}: {
  page: Page;
  networkTimeout?: number;
  allowedArchiveDomains?: string[];
}): Promise<() => Promise<ResourceArchive>> => {
  const cdpClient = await page.context().newCDPSession(page);

  const watcher = new Watcher(cdpClient, allowedArchiveDomains);
  await watcher.watch();

  return async () => {
    await watcher.idle(page, networkTimeout ?? DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS);

    return watcher.archive;
  };
};
