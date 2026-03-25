import type {} from '@vitest/browser-playwright';
import type { CDPSession } from 'vitest/node';

class NetworkIdleTimeoutError extends Error {
  name = 'NetworkIdleTimeoutError';
}

export class NetworkIdleTracker {
  private pending = new Set<string>();

  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  private idleResolvers: Array<() => void> = [];

  private constructor(
    private cdp: CDPSession,
    private idleTimeout: number
  ) {}

  static async create(cdp: CDPSession, idleTimeout: number) {
    const tracker = new NetworkIdleTracker(cdp, idleTimeout);
    await tracker.watch();
    return tracker;
  }

  private async watch() {
    this.cdp.on('Network.requestWillBeSent', this.onRequest);
    this.cdp.on('Network.loadingFinished', this.onComplete);
    this.cdp.on('Network.loadingFailed', this.onComplete);

    await this.cdp.send('Network.enable');
  }

  async off() {
    this.cdp.off('Network.requestWillBeSent', this.onRequest);
    this.cdp.off('Network.loadingFinished', this.onComplete);
    this.cdp.off('Network.loadingFailed', this.onComplete);

    this.clearTimer();
    await this.cdp.send('Network.disable');
  }

  waitForIdle(rejectTimeout: number): Promise<void> {
    if (this.pending.size === 0 && this.idleTimer === null) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new NetworkIdleTimeoutError('Timed out waiting for network to be idle')),
        rejectTimeout
      );
      this.idleResolvers.push(resolve, () => clearTimeout(timeout));
    });
  }

  private onComplete = (params: { requestId: string }) => {
    this.pending.delete(params.requestId);
    if (this.pending.size === 0) {
      this.startTimer();
    }
  };

  private onRequest = (params: { requestId: string }) => {
    this.pending.add(params.requestId);
    this.clearTimer();
  };

  private startTimer() {
    this.clearTimer();

    this.idleTimer = setTimeout(() => {
      this.idleTimer = null;
      this.idleResolvers.splice(0).forEach((fn) => fn());
    }, this.idleTimeout)?.unref();
  }

  private clearTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }
}
