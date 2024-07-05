import { NetworkIdleWatcher } from './network-idle-watcher';

jest.useFakeTimers();

const A_PAGE_URL = 'https://some-url.com';
const A_RESOURCE_URL = 'https://some-url.com/images/cool.jpg';
const ANOTHER_RESOURCE_URL = 'https://some-url.com/images/nice.jpg';
const YET_ANOTHER_RESOURCE_URL = 'https://some-url.com/images/awesome.jpg';

it('Resolves when there is no network activity', async () => {
  const watcher = new NetworkIdleWatcher();
  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Resolves when there is a single request and response', async () => {
  const watcher = new NetworkIdleWatcher();

  watcher.onRequest(A_PAGE_URL);
  watcher.onResponse(A_PAGE_URL);

  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Resolves when there are an equal amount of requests and responses', async () => {
  const watcher = new NetworkIdleWatcher();
  // in total 4 requests, and 4 responses
  watcher.onRequest(A_PAGE_URL);
  watcher.onResponse(A_PAGE_URL);

  watcher.onRequest(A_RESOURCE_URL);
  watcher.onResponse(A_RESOURCE_URL);

  watcher.onRequest(ANOTHER_RESOURCE_URL);
  watcher.onRequest(YET_ANOTHER_RESOURCE_URL);

  watcher.onResponse(ANOTHER_RESOURCE_URL);
  watcher.onResponse(YET_ANOTHER_RESOURCE_URL);

  await expect(watcher.idle()).resolves.toBeDefined();
});

it('Rejects if response never sent for request', async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest(A_RESOURCE_URL);
  const promise = watcher.idle();
  jest.runAllTimers();
  // no response fired off
  await expect(promise).rejects.toBeDefined();
});

it("Resolves if response hasn't happened at time of idle(), but comes back before timeout", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest(A_RESOURCE_URL);

  const promise = watcher.idle();

  watcher.onResponse(A_RESOURCE_URL);
  // makes sure we finish the idle watcher as soon as the reponse comes back, and not waiting the full timeout duration
  jest.advanceTimersByTime(1);

  await expect(promise).resolves.toBeDefined();
});

it("Rejects if response hasn't happened at time of idle(), and doesn't come back before timeout", async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest(A_RESOURCE_URL);

  const promise = watcher.idle();

  // response returns after idle() has been called, but will take too long
  setTimeout(() => {
    watcher.onResponse(A_RESOURCE_URL);
  }, 10000);

  jest.runAllTimers();

  await expect(promise).rejects.toBeDefined();
});
