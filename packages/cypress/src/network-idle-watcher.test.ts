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

it('Resolves when timeout is hit, if request never returns', async () => {
  const watcher = new NetworkIdleWatcher();
  // fire off request
  watcher.onRequest();
  // no response fired off
  await expect(watcher.idle()).resolves.toBeDefined();
});
