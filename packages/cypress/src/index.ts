import CDP, { Version } from 'chrome-remote-interface';
import {
  ResourceArchiver,
  writeTestResult,
  ChromaticStorybookParameters,
  ResourceArchive,
  Viewport,
} from '@chromatic-com/shared-e2e';
import { CypressSnapshot } from './types';

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

// using a single ResourceArchiver instance across all tests (for the test run)
// each time a test completes, we'll save to disk whatever archives are there at that point.
// This should be safe since the same resource from the same URL should be the same during the entire test run.
// Cypress doesn't give us a way to share variables between the "before test" and "after test" lifecycle events on the server.
let resourceArchiver: ResourceArchiver = null;

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

    if (!resourceArchiver) {
      resourceArchiver = new ResourceArchiver(cdp, allowedDomains);
      await resourceArchiver.watch();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('err', err);
  }

  return null;
};

const saveArchives = (archiveInfo: WriteParams) => {
  return new Promise((resolve) => {
    // the resourceArchiver's archives come from the server, everything else (DOM snapshots, test info, etc) comes from the browser
    // notice we're not calling + awaiting resourceArchiver.idle() here...
    // that's because in Cypress, cy.visit() waits until all resources have loaded before finishing
    // so at this point (after the test) we're confident that the resources are all there already without having to wait more
    return writeArchives({ ...archiveInfo, resourceArchive: resourceArchiver.archive }).then(() => {
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
