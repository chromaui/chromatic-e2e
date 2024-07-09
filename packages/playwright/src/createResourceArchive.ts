import type { Page } from 'playwright';
import {
  ResourceArchiver,
  ResourceArchive,
  DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
  logger,
} from '@chromatic-com/shared-e2e';

const idle = async (page: Page, networkTimeoutMs = DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS) => {
  let globalNetworkTimerId: null | ReturnType<typeof setTimeout> = null;
  let globalNetworkResolver: null | (() => void) = null;
  // XXX_jwir3: The way this works is as follows:
  // There are two promises created here. They wrap two separate timers, and we await on a race of both Promises.

  // The first promise wraps a global timeout, where all requests MUST complete before that timeout has passed.
  // If the timeout passes, an error is thrown. This promise can only throw errors, it cannot resolve successfully.
  const globalNetworkTimeout = new Promise<void>((resolve) => {
    globalNetworkResolver = resolve;

    globalNetworkTimerId = setTimeout(() => {
      logger.warn(`Global timeout of ${networkTimeoutMs}ms reached`);
      globalNetworkResolver();
    }, networkTimeoutMs);
  });

  // The second promise wraps a network idle timeout. This uses playwright's built-in functionality to detect when the network
  // is idle.
  const networkIdlePromise = page.waitForLoadState('networkidle').finally(() => {
    clearTimeout(globalNetworkTimerId);
  });

  await Promise.race([globalNetworkTimeout, networkIdlePromise]);
};

export const createResourceArchive = async ({
  page,
  networkTimeout,
  assetDomains,
}: {
  page: Page;
  networkTimeout?: number;
  assetDomains?: string[];
}): Promise<() => Promise<ResourceArchive>> => {
  const cdpClient = await page.context().newCDPSession(page);

  const resourceArchiver = new ResourceArchiver({ cdpClient, allowedDomains: assetDomains });
  await resourceArchiver.watch();

  return async () => {
    await idle(page, networkTimeout ?? DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS);
    await resourceArchiver.close();

    return resourceArchiver.archive;
  };
};
