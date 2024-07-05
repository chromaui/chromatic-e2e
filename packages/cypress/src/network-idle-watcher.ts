const TOTAL_TIMEOUT_DURATION = 3000;

export class NetworkIdleWatcher {
  private numInFlightRequests = 0;

  private idleTimer: NodeJS.Timeout | null = null;

  private exitIdleOnResponse: () => void | null = null;

  async idle() {
    return new Promise((resolve, reject) => {
      if (this.numInFlightRequests === 0) {
        resolve(true);
      } else {
        this.idleTimer = setTimeout(() => {
          reject(new Error('some responses have not returned'));
        }, TOTAL_TIMEOUT_DURATION);

        // assign a function that resolves... and it can be used...
        this.exitIdleOnResponse = () => {
          resolve(true);
        };
      }
    });
  }

  onRequest() {
    this.numInFlightRequests += 1;
  }

  onResponse() {
    this.numInFlightRequests -= 1;
    // resolve if the in-flight request amount is now zero
    if (this.numInFlightRequests === 0) {
      clearTimeout(this.idleTimer);
      this.exitIdleOnResponse?.();
    }
  }
}
