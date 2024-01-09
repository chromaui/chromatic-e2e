import type { elementNode } from 'rrweb-snapshot';
import CDP, { Version } from 'chrome-remote-interface';
import { writeTestResult } from '../write-archive';
import type { ChromaticStorybookParameters } from '../types';
import type { ResourceArchive } from '../resource-archive';
import { Watcher } from '../resource-archive';

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

export const setupNetworkListener = async (): Promise<null> => {
  try {
    const { webSocketDebuggerUrl } = await Version({
      host,
      port,
    });

    const cdp = await CDP({
      target: webSocketDebuggerUrl,
    });

    if (!watcher) {
      watcher = new Watcher(cdp);
      await watcher.watch();
    }
  } catch (err) {
    console.log('err', err);
  }

  return null;
};

export const saveArchives = (archiveInfo: WriteParams) => {
  return new Promise((resolve) => {
    // the watcher's archives come from the server, everything else (DOM snapshots, test info, etc) comes from the browser
    // notice we're not awaiting watcher.idle() here...
    // that's because in Cypress, cy.visit() waits until all resources have loaded before finishing
    // so at this point (after the test) we're confident that the resources are all there already without having to wait more
    return writeArchives({ ...archiveInfo, resourceArchive: watcher.archive }).then(() => {
      resolve(null);
    });
  });
};

// We use this lifecycle hook because we need to know what host and port Chrome Devtools Protocol is listening at.
export const onBeforeBrowserLaunch = (
  // we don't use the browser parameter but we're keeping it here in case we'd ever need to read from it
  // (this way users wouldn't have to change their cypress.config file as it's already passed to us)
  browser: Cypress.Browser,
  launchOptions: Cypress.BeforeBrowserLaunchOptions
) => {
  const hostArg = launchOptions.args.find((arg) => arg.startsWith('--remote-debugging-address='));
  host = hostArg ? hostArg.split('=')[1] : '127.0.0.1';

  const portArg = launchOptions.args.find((arg) => arg.startsWith('--remote-debugging-port='));
  let portString = '';

  if (portArg) {
    [, portString] = portArg.split('=');
  } else {
    // Electron doesn't pass along the address and port in the launch options, so we need to read the port from the
    // environment variable that we'll require the user to use (this assumes the host will be 127.0.0.1).
    const entry = process.env.ELECTRON_EXTRA_LAUNCH_ARGS.split(' ').find((item) =>
      item.startsWith('--remote-debugging-port')
    );
    [, portString] = entry.split('=');
  }

  port = parseInt(portString, 10);

  return launchOptions;
};
