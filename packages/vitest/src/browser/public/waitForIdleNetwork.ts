import { commands } from 'vitest/browser';
import { getCurrentTest } from '../getCurrentTest';
import { isChromium } from '../isChromium';
import type {} from '../../node/commands';

/**
 * Wait for network to be idle, meaning no new network requests for at least `idleNetworkInterval` ms.
 *
 * The `idleNetworkInterval` can be configured via the Chromatic plugin's options.
 *
 * ```ts
 * export default defineConfig({
 *   plugins: [chromaticPlugin({ idleNetworkInterval: 50 })]
 * });
 * ```
 *
 * Use `timeout` argument to reject if network doesn't become idle within given time.
 */
export async function waitForIdleNetwork(timeout: number) {
  if (!isChromium()) {
    return;
  }

  const test = getCurrentTest();

  if (!test) {
    throw new TypeError('waitForIdleNetwork() must be called within a test()');
  }

  if (!test.meta.__chromatic_isRegistered) {
    throw new TypeError(
      'waitForIdleNetwork() cannot be called in a test that is not registered for Chromatic plugin.' +
        `\nMake sure ${test.file.projectName || 'root'} project has chromaticPlugin() enabled.`
    );
  }

  return await commands.__chromatic_waitForIdleNetwork(test.id, timeout);
}
