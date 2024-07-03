import { NetworkIdleWatcher } from './network-idle-watcher';

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

it('Rejects if response never sent for request', async () => {
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

  watcher.onResponse();
  jest.runAllTimers();

  await expect(promise).resolves.toBeDefined();
});

it("Rejects if response hasn't happened at time of idle(), and doesn't come back before timeout", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();

  const promise = watcher.idle();

  // response returns after idle() has been called, but will take too long
  setTimeout(() => {
    watcher.onResponse();
  }, 10000);

  jest.runAllTimers();

  await expect(promise).rejects.toBeDefined();
});
