import type { CDPSession, Page } from 'playwright';
import type { Protocol } from 'playwright-core/types/protocol';
import { logger } from '../logger';

type UrlString = string;

type ArchiveResponse =
  | {
      statusCode: number;
      statusText?: string;
      body: Buffer;
    }
  | {
      error: Error;
    };

export type ResourceArchive = Record<UrlString, ArchiveResponse>;

class Watcher {
  public archive: ResourceArchive = {};

  private client: CDPSession;

  /**
   * We assume the first URL loaded after @watch is called is the base URL of the
   * page and we only save resources that are loaded from the same protocol/host/port combination.
   */
  private firstUrl: URL;

  private closed = false;

  constructor(private page: Page) {}

  async watch() {
    this.client = await this.page.context().newCDPSession(this.page);

    this.client.on('Network.requestWillBeSent', this.requestWillBeSent.bind(this));
    this.client.on('Network.responseReceived', this.responseReceived.bind(this));
    this.client.on('Fetch.requestPaused', this.requestPaused.bind(this));

    await this.client.send('Fetch.enable');
  }

  async idle() {
    // TODO -- wait for network idle
    await new Promise((r) => setTimeout(r, 1000));

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
  }: Protocol.Fetch.requestPausedPayload) {
    const requestUrl = new URL(request.url);

    this.firstUrl ??= requestUrl;

    const isLocalRequest =
      requestUrl.protocol === this.firstUrl.protocol &&
      requestUrl.host === this.firstUrl.host &&
      requestUrl.port === this.firstUrl.port;

    logger.log(
      'requestPaused',
      requestUrl.toString(),
      responseStatusCode || responseErrorReason ? 'response' : 'request',
      this.firstUrl.toString(),
      isLocalRequest
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
      if ([301, 302].includes(responseStatusCode)) {
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

      if (isLocalRequest) {
        this.archive[request.url] = {
          statusCode: responseStatusCode,
          statusText: responseStatusText,
          body: Buffer.from(body, base64Encoded ? 'base64' : 'utf8'),
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

export async function createResourceArchive(page: Page): Promise<() => Promise<ResourceArchive>> {
  const watcher = new Watcher(page);
  await watcher.watch();

  return async () => {
    await watcher.idle();

    return watcher.archive;
  };
}
