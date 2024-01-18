import type { elementNode } from 'rrweb-snapshot';
import CDP, { Version } from 'chrome-remote-interface';
import {
  Watcher,
  writeTestResult,
  ChromaticStorybookParameters,
  ResourceArchive,
} from '@chromaui/shared-e2e';

interface WriteParams {
  testTitle: string;
  domSnapshots: elementNode[];
  chromaticStorybookParams: ChromaticStorybookParameters;
  pageUrl: string;
}

interface WriteArchivesParams extends WriteParams {
  resourceArchive: ResourceArchive;
}

const writeArchives = async ({
  testTitle,
  domSnapshots,
  resourceArchive,
  chromaticStorybookParams,
  pageUrl,
}: WriteArchivesParams) => {
  const bufferedArchiveList = Object.entries(resourceArchive).map(([key, value]) => {
    return [
      key,
      {
        ...value,
        // we can't use Buffer in the browser (when we collect the responses)
        // so we go through one by one here and bufferize them
        // @ts-expect-error will fix when Cypress has its own package
        body: Buffer.from(value.body, 'utf8'),
      },
    ];
  });

  const allSnapshots = Object.fromEntries(
    domSnapshots.map((item, index) => [`Snapshot #${index + 1}`, Buffer.from(JSON.stringify(item))])
  );

  await writeTestResult(
    {
      title: testTitle,
      // this will store it at ./cypress/downloads (the last directory doesn't matter)
      // TODO: change so we don't have to do this trickery
      outputDir: './cypress/downloads/some',
      pageUrl,
    },
    allSnapshots,
    Object.fromEntries(bufferedArchiveList),
    chromaticStorybookParams
  );
};

// using a single Watcher instance across all tests (for the test run)
// each time a test completes, we'll save to disk whatever archives are there at that point.
// This should be safe since the same resource from the same URL should be the same during the entire test run.
// Cypress doesn't give us a way to share variables between the "before test" and "after test" lifecycle events on the server.
let watcher: Watcher = null;

let host = '';
let port = 0;

const setupNetworkListener = async ({
  allowedDomains,
}: {
  allowedDomains?: string[];
}): Promise<null> => {
  try {
    const { webSocketDebuggerUrl } = await Version({
      host,
      port,
    });

    const cdp = await CDP({
      target: webSocketDebuggerUrl,
    });

    if (!watcher) {
      watcher = new Watcher(cdp, allowedDomains);
      await watcher.watch();
    }
  } catch (err) {
    console.log('err', err);
  }

  return null;
};

const saveArchives = (archiveInfo: WriteParams) => {
  return new Promise((resolve) => {
    // the watcher's archives come from the server, everything else (DOM snapshots, test info, etc) comes from the browser
    // notice we're not calling + awaiting watcher.idle() here...
    // that's because in Cypress, cy.visit() waits until all resources have loaded before finishing
    // so at this point (after the test) we're confident that the resources are all there already without having to wait more
    return writeArchives({ ...archiveInfo, resourceArchive: watcher.archive }).then(() => {
      resolve(null);
    });
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
  // when Cypress is in interactive mode, we won't be snapshotting.
  // Thus we don't need them to pass the ELECTRON_EXTRA_LAUNCH_ARGS for this command,
  // or set up CDP or anything like that
  if (config.isInteractive) {
    return;
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
