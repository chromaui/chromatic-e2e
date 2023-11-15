import type { CDPSession, Page } from 'playwright';
import type { Protocol } from 'playwright-core/types/protocol';
import { logger } from '../utils/logger';

import { DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS } from '../constants';

export type UrlString = string;

export type ArchiveResponse =
  | {
      statusCode: number;
      statusText?: string;
      body: Buffer;
      contentType?: string;
    }
  | {
      error: Error;
    };

export type ResourceArchive = Record<UrlString, ArchiveResponse>;

class Watcher {
  public archive: ResourceArchive = {};

  private client: CDPSession;

  private globalNetworkTimeoutMs;

  private allowedExternalDomains: string[];

  /**
   * We assume the first URL loaded after @watch is called is the base URL of the
   * page and we only save resources that are loaded from the same protocol/host/port combination.
   * We also skip archiving this page because we only care about resources requested by this page.
   */
  private firstUrl: URL;

  private closed = false;

  private globalNetworkTimerId: null | ReturnType<typeof setTimeout> = null;

  private globalNetworkResolver: () => void;

  constructor(
    private page: Page,
    networkTimeoutMs = DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
    allowedDomains?: string[]
  ) {
    this.globalNetworkTimeoutMs = networkTimeoutMs;
    this.allowedExternalDomains = allowedDomains || [];
  }

  async watch() {
    this.client = await this.page.context().newCDPSession(this.page);

    this.client.on('Network.requestWillBeSent', this.requestWillBeSent.bind(this));
    this.client.on('Network.responseReceived', this.responseReceived.bind(this));
    this.client.on('Fetch.requestPaused', this.requestPaused.bind(this));

    await this.client.send('Fetch.enable');
  }

  async idle() {
    // XXX_jwir3: The way this works is as follows:
    // There are two promises created here. They wrap two separate timers, and we await on a race of both Promises.

    // The first promise wraps a global timeout, where all requests MUST complete before that timeout has passed.
    // If the timeout passes, an error is thrown. This promise can only throw errors, it cannot resolve successfully.
    const globalNetworkTimeout = new Promise<void>((resolve, reject) => {
      // this.globalNetworkRejector = reject;
      this.globalNetworkResolver = resolve;

      this.globalNetworkTimerId = setTimeout(() => {
        logger.warn(`Global timeout of ${this.globalNetworkTimeoutMs}ms reached`);
        this.globalNetworkResolver();
      }, this.globalNetworkTimeoutMs);
    });

    // The second promise wraps a network idle timeout. This uses playwright's built-in functionality to detect when the network
    // is idle.
    const networkIdlePromise = this.page.waitForLoadState('networkidle').finally(() => {
      clearTimeout(this.globalNetworkTimerId);
    });

    await Promise.race([globalNetworkTimeout, networkIdlePromise]);

    logger.log('Watcher closing');
    this.closed = true;
  }

  setResponse(url: UrlString, response: ArchiveResponse) {
    this.archive[url] = response;
  }

  requestWillBeSent(event: Protocol.Network.requestWillBeSentPayload) {
    logger.log('requestWillBeSent');
    logger.log(event);
  }

  responseReceived(event: Protocol.Network.responseReceivedPayload) {
    logger.log('responseReceived');
    logger.log(event);
  }

  async clientSend<T extends keyof Protocol.CommandParameters>(
    request: Protocol.Network.Request,
    method: T,
    params?: Protocol.CommandParameters[T]
  ): Promise<Protocol.CommandReturnValues[T] | null> {
    try {
      return await this.client.send(method, params);
    } catch (error) {
      logger.log('Client error', request.url, error);
      this.archive[request.url] = { error };
      return null;
    }
  }

  async requestPaused({
    requestId,
    request,
    responseStatusCode,
    responseStatusText,
    responseErrorReason,
    responseHeaders,
  }: Protocol.Fetch.requestPausedPayload) {
    // We only need to capture assets that will render when the DOM snapshot is rendered,
    // so we only need to handle GET requests.
    if (!request.method.match(/get/i)) {
      await this.clientSend(request, 'Fetch.continueRequest', { requestId });
      return;
    }

    const requestUrl = new URL(request.url);

    this.firstUrl ??= requestUrl;

    const isRequestFromAllowedDomain =
      requestUrl.origin === this.firstUrl.origin ||
      this.allowedExternalDomains.includes(requestUrl.origin);

    logger.log(
      'requestPaused',
      requestUrl.toString(),
      responseStatusCode || responseErrorReason ? 'response' : 'request',
      this.firstUrl.toString(),
      isRequestFromAllowedDomain
    );

    if (this.closed) {
      logger.log('Watcher closed, ignoring');
    }

    // Pausing at response stage with an error, simply ignore
    if (responseErrorReason) {
      logger.log(`Got response error: ${responseErrorReason}`);
      await this.clientSend(request, 'Fetch.continueRequest', { requestId });
      return;
    }

    // Pausing a response stage with a response
    if (responseStatusCode) {
      if ([301, 302, 307, 308].includes(responseStatusCode)) {
        await this.clientSend(request, 'Fetch.continueRequest', {
          requestId,
          interceptResponse: true,
        });
        return;
      }

      const result = await this.clientSend(request, 'Fetch.getResponseBody', {
        requestId,
      });
      // Something has gone wrong and will be logged above
      if (result === null) {
        return;
      }
      const { body, base64Encoded } = result;

      // If the Content-Type header is present, let's capture it.
      const contentTypeHeader: Protocol.Fetch.HeaderEntry = responseHeaders.find(
        ({ name }) => name === 'Content-Type'
      );

      // No need to capture the response of the top level page request
      const isFirstRequest = requestUrl.toString() === this.firstUrl.toString();
      if (isRequestFromAllowedDomain && !isFirstRequest) {
        this.archive[request.url] = {
          statusCode: responseStatusCode,
          statusText: responseStatusText,
          body: Buffer.from(body, base64Encoded ? 'base64' : 'utf8'),
          contentType: contentTypeHeader?.value,
        };
      }

      await this.clientSend(request, 'Fetch.continueRequest', { requestId });
      return;
    }

    const response = this.archive[request.url];
    if (response && 'statusCode' in response) {
      logger.log(`pausing request we've seen before, sending previous response`);
      logger.log({
        requestId,
        responseCode: response.statusCode,
        responsePhrase: response.statusText,
      });
      await this.clientSend(request, 'Fetch.fulfillRequest', {
        requestId,
        responseCode: response.statusCode,
        ...(response.statusText && { responsePhrase: response.statusText }),
        // responseHeaders: response.headers, TODO - mapping
        body: response.body.toString('base64'),
      });
      return;
    }

    await this.clientSend(request, 'Fetch.continueRequest', {
      requestId,
      interceptResponse: true,
    });
  }
}

export async function createResourceArchive({
  page,
  networkTimeout,
  allowedExternalDomains,
}: {
  page: Page;
  networkTimeout?: number;
  allowedExternalDomains?: string[];
}): Promise<() => Promise<ResourceArchive>> {
  const watcher = new Watcher(
    page,
    networkTimeout ?? DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
    allowedExternalDomains
  );
  await watcher.watch();

  return async () => {
    await watcher.idle();

    return watcher.archive;
  };
}
