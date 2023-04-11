import type { CDPSession, Page } from 'playwright';
import type { Protocol } from 'playwright-core/types/protocol';
import { logger } from '../logger';

type Url = string;

interface ArchiveResponse {
  statusCode: number;
  statusText?: string;
  body: Buffer;
}

export type ResourceArchive = Record<Url, ArchiveResponse>;

class Watcher {
  public archive: ResourceArchive = {};

  private client: CDPSession;

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

  setResponse(url: Url, response: ArchiveResponse) {
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

  async requestPaused({
    requestId,
    request,
    responseStatusCode,
    responseStatusText,
    responseErrorReason,
  }: Protocol.Fetch.requestPausedPayload) {
    logger.log(
      'requestPaused',
      request.url,
      responseStatusCode || responseErrorReason ? 'response' : 'request'
    );

    if (this.closed) {
      logger.log('Watcher closed, ignoring');
    }

    // Pausing at response stage with an error
    if (responseErrorReason) {
      throw new Error('TODO');
    }

    // Pausing a response stage with a response
    if (responseStatusCode) {
      const { body, base64Encoded } = await this.client.send('Fetch.getResponseBody', {
        requestId,
      });

      this.archive[request.url] = {
        statusCode: responseStatusCode,
        statusText: responseStatusText,
        body: Buffer.from(body, base64Encoded ? 'base64' : 'utf8'),
      };

      await this.client.send('Fetch.continueRequest', { requestId });
      return;
    }

    const response = this.archive[request.url];
    if (response) {
      logger.log(`pausing request we've seen before, sending previous response`);
      logger.log({
        requestId,
        responseCode: response.statusCode,
        responsePhrase: response.statusText,
      });
      await this.client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: response.statusCode,
        ...(response.statusText && { responsePhrase: response.statusText }),
        // responseHeaders: response.headers, TODO - mapping
        body: response.body.toString('base64'),
      });
      return;
    }

    await this.client.send('Fetch.continueRequest', {
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
