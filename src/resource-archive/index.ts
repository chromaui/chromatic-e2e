import type { Protocol } from 'playwright-core/types/protocol';
import { logger } from '../utils/logger';

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

// a custom interface that satisfies both playwright's CDPSession and chrome-remote-interface's CDP.Client types.
interface CDPClient {
  on: (eventName: keyof Protocol.Events, handlerFunction: (params?: any) => void) => void;
  send: (eventName: keyof Protocol.CommandParameters, payload?: any) => Promise<any>;
}

export class Watcher {
  public archive: ResourceArchive = {};

  private client: CDPClient;

  /** 
   Specifies which domains (origins) we should archive resources for (by default we only archive same-origin resources).
   Useful in situations where the environment running the archived storybook (e.g. in CI) may be restricted to an intranet or other domain restrictions
  */
  private allowedArchiveOrigins: string[];

  /**
   * We assume the first URL loaded after @watch is called is the base URL of the
   * page and we only save resources that are loaded from the same protocol/host/port combination.
   * We also skip archiving this page because we only care about resources requested by this page.
   */
  private firstUrl: URL;

  constructor(cdpClient: CDPClient, allowedDomains?: string[]) {
    this.client = cdpClient;
    // tack on the protocol so we can properly check if requests are cross-origin
    this.allowedArchiveOrigins = (allowedDomains || []).map((domain) => `https://${domain}`);
  }

  async watch() {
    this.client.on('Fetch.requestPaused', this.requestPaused.bind(this));
    await this.client.send('Fetch.enable');
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

    // There's no reponse body for us to archive on 304s
    if (responseStatusCode === 304) {
      await this.clientSend(request, 'Fetch.continueRequest', { requestId });
      return;
    }

    const requestUrl = new URL(request.url);

    this.firstUrl ??= requestUrl;

    const isRequestFromAllowedDomain =
      requestUrl.origin === this.firstUrl.origin ||
      this.allowedArchiveOrigins.includes(requestUrl.origin);

    logger.log(
      'requestPaused',
      requestUrl.toString(),
      responseStatusCode || responseErrorReason ? 'response' : 'request',
      this.firstUrl.toString(),
      isRequestFromAllowedDomain
    );

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
        ({ name }) => name.toLowerCase() === 'content-type'
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

    await this.clientSend(request, 'Fetch.continueRequest', {
      requestId,
      interceptResponse: true,
    });
  }
}
