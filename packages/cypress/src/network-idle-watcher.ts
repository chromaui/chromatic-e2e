export class NetworkIdleWatcher {
  private numInFlightRequests = 0;
  // private idleTimer = null;

  async idle() {
    return new Promise((resolve, reject) => {
      if (this.numInFlightRequests === 0) {
        resolve('cool');
      } else {
        reject('done');
      }
    });
  }

  onRequest() {
    this.numInFlightRequests += 1;
  }

  onResponse() {
    this.numInFlightRequests -= 1;
  }
}
