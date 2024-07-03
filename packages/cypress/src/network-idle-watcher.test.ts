import { NetworkIdleWatcher } from './network-idle-watcher';

/*

  What is this thing's role?

  Times out after a certain amount of time if there's no network activity
  If there's network activity, doesn't time out
  Times out if network activity isn't enough...
  Each time response comes back

*/

it('Resolves when there is no network activity', async () => {
  const watcher = new NetworkIdleWatcher();
  await expect(watcher.idle()).resolves.toBeDefined();
});

it.skip('Rejects when timeout is hit, if request never returns', async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();
  // no response fired off
  await expect(watcher.idle()).rejects.toBeDefined();
});

it('Resolves when there is a single request and response', async () => {
  const watcher = new NetworkIdleWatcher();

  watcher.onRequest();
  watcher.onResponse();

  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Resolves when there are an equal amount of requests and responses', async () => {
  const watcher = new NetworkIdleWatcher();

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
