export const TOTAL_TIMEOUT_DURATION = 3000;
export const WATERFALL_BETWEEN_STEPS_DURATION = 200;

// A Cypress equivalent of Playwright's `page.waitForLoadState()` (https://playwright.dev/docs/api/class-page#page-wait-for-load-state).
// Intentionally simplistic since in Cypress this is just used to make sure there aren't any pending requests hanging around
// after the test has finished.
export class NetworkIdleWatcher {
  private numInFlightRequests = 0;

  private idleTimer: NodeJS.Timeout | null = null;

  private waterfallBetweenStepsTimer: NodeJS.Timeout | null = null;

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
          this.waterfallBetweenStepsTimer = setTimeout(() => {
            // only resolve if there STILL aren't any incoming requests (after waiting the timeout)
            if (this.numInFlightRequests === 0) {
              clearTimeout(this.idleTimer);
              resolve(true);
            }
          }, WATERFALL_BETWEEN_STEPS_DURATION);
        };
      }
    });
  }

  onRequest(url: string) {
    this.numInFlightRequests += 1;
    console.log('REQUEST', url);
  }

  onResponse(url: string) {
    this.numInFlightRequests -= 1;
    console.log('RESPONSE', url);
    // resolve immediately if the in-flight request amount is now zero
    if (this.numInFlightRequests === 0) {
      this.exitIdleOnResponse?.();
    }
  }
}
