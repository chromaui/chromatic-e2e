export class NetworkIdleWatcher {
  private numInFlightRequests = 0;
  private idleTimer = null;
  private bailIdleOnResponse = null;

  async idle() {
    return new Promise((resolve, reject) => {
      if (this.numInFlightRequests === 0) {
        resolve('cool');
      } else {
        this.idleTimer = setTimeout(() => {
          if (this.numInFlightRequests !== 0) {
            reject('done');
          } else {
            resolve('cool');
          }
        }, 3000);

        // assign a function that resolves... and it can be used...
        this.bailIdleOnResponse = () => {
          resolve('cool');
        };
      }
    });
  }

  onRequest() {
    this.numInFlightRequests += 1;
  }

  onResponse() {
    this.numInFlightRequests -= 1;
    // if we get back down to 0 in meantime... would be nice to not wait 3s to resolve...
    // anything we can do about that here?
    if (this.numInFlightRequests === 0) {
      this.bailIdleOnResponse?.();
    }
  }
}
