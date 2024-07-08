import {
  NetworkIdleWatcher,
  TOTAL_TIMEOUT_DURATION,
  WATERFALL_BETWEEN_STEPS_DURATION,
} from './network-idle-watcher';

const A_PAGE_URL = 'https://some-url.com';
const A_RESOURCE_URL = 'https://some-url.com/images/cool.jpg';
const ANOTHER_RESOURCE_URL = 'https://some-url.com/images/nice.jpg';
const YET_ANOTHER_RESOURCE_URL = 'https://some-url.com/images/awesome.jpg';

beforeEach(() => {
  jest.useFakeTimers();
});

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
  // makes sure we finish the idle watcher as soon as we can, and not waiting the full timeout duration
  jest.advanceTimersByTime(WATERFALL_BETWEEN_STEPS_DURATION);

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
  }, TOTAL_TIMEOUT_DURATION * 2);

  jest.runAllTimers();

  await expect(promise).rejects.toBeDefined();
});

/*
  Waits until the next event loop, so that promise resolutions happen before code that comes after it
  This is needed because promises otherwise resolve after their assertions, like so:
    promise.then(() => {
      callback();
    });

    // some code that should cause `promise` to resolve

    // this will fail because the promise resolution happens on the next event loop
    expect(callback).toHaveBeenCalled();

  `flushPromises` ensures that we wait for the (next event loop) promise resolutions before asserting.
*/
const flushPromises = () => {
  // props to https://github.com/jestjs/jest/issues/2157#issuecomment-897935688
  return new Promise((resolve) => {
    jest.requireActual('timers').setImmediate(() => resolve(null));
  });
};

it("Does not prematurely resolve if there's a small gap between one response ending and another request beginning (typical network waterfall)", async () => {
  const callback = jest.fn();
  // Simulate a typical page network waterfall, like this:
  // --------HTML Document--------
  //                                -------Resource HTML Document requests-------
  const watcher = new NetworkIdleWatcher();
  // fire off an initial request
  watcher.onRequest(A_PAGE_URL);
  const promise = watcher.idle();

  // For some reason, trying to assert on promise.resolves didn't work for the first assertion --
  // The eventual resolution of the promise (later on) would retroactively fail the first assertion.
  // Hence we're using a callback instead.
  promise.then(() => {
    callback();
  });

  watcher.onResponse(A_PAGE_URL);
  await flushPromises();
  // verify idle() hasn't been resolved yet
  expect(callback).not.toHaveBeenCalled();

  // send off another request and response
  watcher.onRequest(A_RESOURCE_URL);
  watcher.onResponse(A_RESOURCE_URL);

  jest.runAllTimers();
  await flushPromises();
  // verify that idle() has now been resolved
  expect(callback).toHaveBeenCalled();
});

const waitForResponse = (durationInMs: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, durationInMs);
  });
};

it.only('Rejects if initial response comes back in time, but subsequent response does not', async () => {
  const watcher = new NetworkIdleWatcher();
  watcher.onRequest(A_PAGE_URL);
  const promise = watcher.idle();

  watcher.onResponse(A_PAGE_URL);
  watcher.onRequest(A_RESOURCE_URL);
  // simulate the response taking way too long to return
  waitForResponse(TOTAL_TIMEOUT_DURATION * 2);
  jest.advanceTimersByTime(TOTAL_TIMEOUT_DURATION * 2);

  await expect(promise).rejects.toBeDefined();
});
