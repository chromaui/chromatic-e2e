const TOTAL_TIMEOUT_DURATION = 3000;

// A Cypress equivalent of Playwright's `page.waitForLoadState()` (https://playwright.dev/docs/api/class-page#page-wait-for-load-state).
// Intentionally simplistic since in Cypress this is just used to make sure there aren't any pending requests hanging around
// after the test has finished.
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

        // assign a function that'll be called as soon as responses are all back
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
    // resolve immediately if the in-flight request amount is now zero
    if (this.numInFlightRequests === 0) {
      clearTimeout(this.idleTimer);
      this.exitIdleOnResponse?.();
    }
  }
}
