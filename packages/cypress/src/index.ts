import type { elementNode } from 'rrweb-snapshot';
import CDP, { Version } from 'chrome-remote-interface';
import {
  ResourceArchiver,
  writeTestResult,
  ChromaticStorybookParameters,
  ResourceArchive,
  Viewport,
} from '@chromatic-com/shared-e2e';
import { NetworkIdleWatcher } from './network-idle-watcher';

interface CypressSnapshot {
  // the name of the snapshot (optionally provided for manual snapshots, never provided for automatic snapshots)
  name?: string;
  // the DOM snapshot
  snapshot: elementNode;
}

interface WriteParams {
  testTitlePath: string[];
  domSnapshots: CypressSnapshot[];
  chromaticStorybookParams: ChromaticStorybookParameters;
  pageUrl: string;
  viewport: Viewport;
  outputDir: string;
}

interface WriteArchivesParams extends WriteParams {
  resourceArchive: ResourceArchive;
}

const writeArchives = async ({
  testTitlePath,
  domSnapshots,
  resourceArchive,
  chromaticStorybookParams,
  pageUrl,
  viewport,
  outputDir,
}: WriteArchivesParams) => {
  const allSnapshots = Object.fromEntries(
    // manual snapshots can be given a name; otherwise, just use the snapshot's place in line as the name
    domSnapshots.map(({ name, snapshot }, index) => [
      name ?? `Snapshot #${index + 1}`,
      Buffer.from(JSON.stringify(snapshot)),
    ])
  );

  await writeTestResult(
    {
      titlePath: testTitlePath,
      outputDir,
      pageUrl,
      viewport,
    },
    allSnapshots,
    resourceArchive,
    chromaticStorybookParams
  );
};

// Cypress doesn't have a way (on the server) of scoping things per-test.
// Thus we'll make a lookup table of ResourceArchivers (one per test, with testId as the key)
// So we can still have test-specific archiving configuration (like which domains to archive)
const resourceArchivers: Record<string, ResourceArchiver> = {};
// same for network idle watchers
const networkIdleWatchers: Record<string, NetworkIdleWatcher> = {};

const testSpecificArchiveUrls: Record<string, string[]> = {};

let mainArchive: ResourceArchive = {};

let host = '';
let port = 0;
let debuggerUrl = '';

const setupNetworkListener = async ({
  allowedDomains,
  testId,
}: {
  allowedDomains?: string[];
  testId: string;
}): Promise<null> => {
  try {
    if (!debuggerUrl) {
      const { webSocketDebuggerUrl } = await Version({
        host,
        port,
      });
      debuggerUrl = webSocketDebuggerUrl;
    }

    const cdp = await CDP({
      target: debuggerUrl,
    });

    const networkIdleWatcher = new NetworkIdleWatcher();
    networkIdleWatchers[testId] = networkIdleWatcher;
    testSpecificArchiveUrls[testId] = [];
    resourceArchivers[testId] = new ResourceArchiver({
      cdpClient: cdp,
      allowedDomains,
      // important that we don't directly pass networkIdleWatcher.onRequest here,
      // as that'd bind `this` in that method to the ResourceArchiver
      onRequest: (url) => {
        networkIdleWatcher.onRequest(url);
        testSpecificArchiveUrls[testId].push(url);
      },
      // important that we don't directly pass networkIdleWatcher.onResponse here,
      // as that'd bind `this` in that method to the ResourceArchiver
      onResponse: (url) => {
        networkIdleWatcher.onResponse(url);
      },
    });
    await resourceArchivers[testId].watch();
  } catch (err) {
    console.log('err', err);
  }

  return null;
};

const saveArchives = (archiveInfo: WriteParams & { testId: string }) => {
  return new Promise((resolve) => {
    const { testId, ...rest } = archiveInfo;
    const resourceArchiver = resourceArchivers[testId];
    if (!resourceArchiver) {
      console.error('Unable to archive results for test');
      resolve(null);
    }

    const networkIdleWatcher = networkIdleWatchers[testId];
    if (!networkIdleWatcher) {
      console.error('No idle watcher found for test');
      resolve(null);
    }

    // `finally` instead of `then` because we need to know idleness however it happened
    return (
      networkIdleWatcher
        .idle()
        // errors that happened when detecting network idleness should be logged,
        // but shouldn't error out the entire Cypress test run
        .catch((err: Error) => {
          console.error(`Error when archiving resources for test "${testId}": ${err.message}`);
        })
        .finally(() => {
          // the watcher's archives come from the server, everything else (DOM snapshots, test info, etc) comes from the browser
          const { archive } = resourceArchiver;

          mainArchive = {
            ...mainArchive,
            ...archive,
          };

          const finalArchive: ResourceArchive = {};

          // make a subset of this archive that you will actually save
          testSpecificArchiveUrls[testId].forEach((url) => {
            if (mainArchive[url]) {
              finalArchive[url] = mainArchive[url];
            }
          });

          // clean up the CDP instance
          return resourceArchivers[testId].close().then(() => {
            // remove archives off of object after write them
            delete resourceArchivers[testId];
            return writeArchives({ ...rest, resourceArchive: finalArchive }).then(() => {
              resolve(null);
            });
          });
        })
    );
  });
};

interface TaskParams {
  action: 'setup-network-listener' | 'save-archives';
  payload?: any;
}

// Handles all server-side tasks, dispatching each to its proper handler.
// Why? So users don't have to register all these individual tasks
// (they can just import and register prepareArchives)
export const prepareArchives = async ({ action, payload }: TaskParams) => {
  switch (action) {
    case 'setup-network-listener':
      return setupNetworkListener(payload);
    case 'save-archives':
      return saveArchives(payload);
    default:
      return null;
  }
};

// We use this lifecycle hook because we need to know what host and port Chrome Devtools Protocol is listening at.
export const onBeforeBrowserLaunch = (
  // we don't use the browser parameter but we're keeping it here in case we'd ever need to read from it
  // (this way users wouldn't have to change their cypress.config file as it's already passed to us)
  browser: Cypress.Browser,
  launchOptions: Cypress.BeforeBrowserLaunchOptions,
  config: Cypress.PluginConfigOptions
) => {
  // don't take snapshots when running `cypress open`
  if (!config.isTextTerminal) {
    return launchOptions;
  }

  const hostArg = launchOptions.args.find((arg) => arg.startsWith('--remote-debugging-address='));
  host = hostArg ? hostArg.split('=')[1] : '127.0.0.1';

  const portArg = launchOptions.args.find((arg) => arg.startsWith('--remote-debugging-port='));
  let portString = '';

  if (portArg) {
    [, portString] = portArg.split('=');
  } else if (process.env.ELECTRON_EXTRA_LAUNCH_ARGS) {
    // Electron doesn't pass along the address and port in the launch options, so we need to read the port from the
    // environment variable that we'll require the user to use (this assumes the host will be 127.0.0.1).
    const entry = process.env.ELECTRON_EXTRA_LAUNCH_ARGS.split(' ').find((item) =>
      item.startsWith('--remote-debugging-port')
    );
    [, portString] = entry.split('=');
  } else {
    throw new Error(
      'Please provide a port number \nExample: ELECTRON_EXTRA_LAUNCH_ARGS=--remote-debugging-port=<port-number> yarn cypress run'
    );
  }

  port = parseInt(portString, 10);

  return launchOptions;
};

export const installPlugin = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  // these events are run on the server (in Node)
  on('task', {
    prepareArchives,
  });
  on(
    'before:browser:launch',
    (browser: Cypress.Browser, launchOptions: Cypress.BeforeBrowserLaunchOptions) => {
      onBeforeBrowserLaunch(browser, launchOptions, config);
    }
  );
};
