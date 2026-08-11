import { commands } from 'vitest/browser';
import { getCurrentTest } from '../getCurrentTest';
import { isChromium } from '../isChromium';
import { trackEvent } from '../telemetry';
import type {} from '../../node/commands';

interface Options {
  _internal: boolean;
}

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
async function waitForIdleNetwork(timeout: number): Promise<void>;

/** @internal Pass options when called internally by the plugin */
async function waitForIdleNetwork(timeout: number, options: Options): Promise<void>;

async function waitForIdleNetwork(timeout: number, options?: Options): Promise<void> {
  if (!isChromium()) {
    return;
  }

  const isCalledByUser = options?._internal !== true;
  const test = getCurrentTest();

  if (!test) {
    trackEvent({
      eventType: 'wait_for_idle_network_invalid_call',
      level: 'error',
      payload: {
        isInsideTest: false,
        isRegisteredTest: undefined,
        isCalledByUser,
      },
    });

    throw new TypeError('waitForIdleNetwork() must be called within a test()');
  }

  if (!test.meta.__chromatic_isRegistered) {
    trackEvent({
      eventType: 'wait_for_idle_network_invalid_call',
      level: 'error',
      payload: {
        isInsideTest: true,
        isRegisteredTest: false,
        isCalledByUser,
      },
    });

    throw new TypeError(
      'waitForIdleNetwork() cannot be called in a test that is not registered for Chromatic plugin.' +
        `\nMake sure ${test.file.projectName || 'root'} project has chromaticPlugin() enabled.`
    );
  }

  if (isCalledByUser) {
    trackEvent({ eventType: 'wait_for_idle_network_called', level: 'info', payload: { timeout } });
  }

  try {
    await commands.__chromatic_waitForIdleNetwork(timeout);
  } catch (error) {
    const isTimeoutError =
      error instanceof Error && error.message.includes('Timed out waiting for network to be idle');

    if (isTimeoutError) {
      trackEvent({
        eventType: 'wait_for_idle_network_timeout',
        level: 'error',
        payload: { timeout, isCalledByUser },
      });
    }

    throw error;
  }
}

export { waitForIdleNetwork };
