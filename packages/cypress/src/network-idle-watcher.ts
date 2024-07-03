export class NetworkIdleWatcher {
  private numInFlightRequests = 0;

  async idle() {
    return new Promise((resolve) => {
      if (this.numInFlightRequests === 0) {
        resolve('cool');
      } else {
        setTimeout(() => {
          resolve('done');
        }, 3000);
      }
    });
  }

  onRequest() {
    this.numInFlightRequests += 1;
  }
}
