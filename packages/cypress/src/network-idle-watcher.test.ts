import { NetworkIdleWatcher } from './network-idle-watcher';

/*

  What is this thing's role?

  Times out after a certain amount of time if there's no network activity
  If there's network activity, doesn't time out
  Times out if network activity isn't enough...
  Each time response comes back

*/

jest.useFakeTimers();

it('Resolves when there is no network activity', async () => {
  const watcher = new NetworkIdleWatcher();
  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Resolves when there is a single request and response', async () => {
  const watcher = new NetworkIdleWatcher();

  watcher.onRequest();
  watcher.onResponse();

  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Resolves when there are an equal amount of requests and responses', async () => {
  const watcher = new NetworkIdleWatcher();
  // in total 4 requests, and 4 responses
  watcher.onRequest();
  watcher.onResponse();

  watcher.onRequest();
  watcher.onResponse();

  watcher.onRequest();
  watcher.onRequest();

  watcher.onResponse();
  watcher.onResponse();

  await expect(watcher.idle()).resolves.toBeDefined();
});

it("Rejects if response didn't happen for request", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();
  const promise = watcher.idle();
  jest.runAllTimers();
  // no response fired off
  await expect(promise).rejects.toBeDefined();
});

it("Resolves if response hasn't happened at time of idle(), but comes back before timeout", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();

  const promise = watcher.idle();

  // response returns after idle() has been called
  waitForResponse(watcher, 2000);
  jest.runAllTimers();

  await expect(promise).resolves.toBeDefined();
});

it("Rejects if response hasn't happened at time of idle(), and doesn't come back before timeout", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();

  const promise = watcher.idle();

  // response returns after idle() has been called, will take too long
  waitForResponse(watcher, 10000);
  jest.runAllTimers();

  await expect(promise).rejects.toBeDefined();
});

const waitForResponse = async (watcher, timeInMs) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      watcher.onResponse();
      resolve();
    }, timeInMs);
  });
};

it.skip('Given multiple cascading requests, resolves when all requests are returned, even though collectively they take a long time', async () => {
  const watcher = new NetworkIdleWatcher();
  // Each individual request is smaller than the interval to consider the network "idle", but collectively longer than
  // the watcher will wait for a single test.
  watcher.onRequest();

  await waitForResponse(watcher, 2000);

  watcher.onRequest();

  await waitForResponse(watcher, 2000);

  watcher.onRequest();

  await waitForResponse(watcher, 2000);

  await expect(watcher.idle()).resolves.toBeDefined();
});

// make sure resolves/rejects hasn't been called until all requests are back (not resolving when any old thing returns)

// then only do smaller interval if fewer than 2 resources waiting
