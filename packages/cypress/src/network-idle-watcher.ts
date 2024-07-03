export class NetworkIdleWatcher {
  private numInFlightRequests = 0;

  async idle() {
    if (this.numInFlightRequests === 0) {
      return Promise.resolve('cool');
    }
  }

  onRequest() {
    this.numInFlightRequests += 1;
  }
}
