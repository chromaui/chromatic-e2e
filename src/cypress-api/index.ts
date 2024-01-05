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
    watcher.idle().then(() => {
      // write archive to disk
      return writeArchives({ ...archiveInfo, resourceArchive: watcher.archive }).then(() => {
        resolve(null);
      });
    });
  });
};

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
    const entry = process.env.ELECTRON_EXTRA_LAUNCH_ARGS.split(' ').find((item) =>
      item.startsWith('--remote-debugging-port')
    );
    [, portString] = entry.split('=');
  }

  port = parseInt(portString, 10);

  return launchOptions;
};
