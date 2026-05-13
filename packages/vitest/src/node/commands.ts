import assert from 'node:assert';
import { resolve } from 'node:path';
import type { TestCase, TestModule, TestSuite, BrowserCommand } from 'vitest/node';
import { type PlaywrightProviderOptions } from '@vitest/browser-playwright';
import { type Task } from '@vitest/runner/types';
import { type serializedNodeWithId } from '@rrweb/types';
import { ResourceArchiver, writeTestResult, type DOMSnapshots } from '@chromatic-com/shared-e2e';
import { type ChromaticNamespace, type ResolvedOptions } from '../types';
import { NetworkIdleTracker } from './NetworkIdleTracker';

type TestID = Task['id'];
type SnapshotName = keyof DOMSnapshots;

export function createCommands(options: ResolvedOptions) {
  const resourceArchivers = new Map<TestID, ResourceArchiver>();
  const networkIdleTrackers = new Map<TestID, NetworkIdleTracker>();
  const snapshots = new Map<
    TestID,
    Map<
      SnapshotName,
      {
        snapshot: serializedNodeWithId;
        viewport: DOMSnapshots[string]['viewport'];
        pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'];
      }
    >
  >();

  return {
    /**
     * Get resolved options on the client side.
     * All options must be serializable at this point.
     */
    async __chromatic_getOptions() {
      return options;
    },

    /**
     * Store a `@rrweb` generated DOM snapshot for the test.
     * Can be called multiple times during a single test case.
     */
    async __chromatic_uploadDOMSnapshot(
      context,
      id: TestID,
      snapshot: serializedNodeWithId,
      pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'],
      name?: string
    ) {
      let sessionSnapshots = snapshots.get(id);

      if (!sessionSnapshots) {
        sessionSnapshots = new Map();
        snapshots.set(id, sessionSnapshots);
      }

      name ||= `Snapshot #${sessionSnapshots.size + 1}`;

      const frame = await context.frame();
      const viewport = await frame.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

      sessionSnapshots.set(name, { snapshot, viewport, pseudoClassIds });
    },

    /**
     * Wait for network to be idle, meaning no new network requests for at least `idleNetworkInterval` ms.
     * Use `timeout` argument to reject if network doesn't become idle within given time.
     */
    async __chromatic_waitForIdleNetwork(_, id: TestID, timeout: number): Promise<void> {
      const networkIdleTracker = networkIdleTrackers.get(id);
      assert(networkIdleTracker, `No network idle tracker found for test ${id}`);

      await networkIdleTracker.waitForIdle(timeout);
    },

    /**
     * Start recording HTTP resources and network activity for given test.
     */
    async __chromatic_interceptFetch(context, id: TestID) {
      const cdp = await context.provider.getCDPSession?.(context.sessionId);
      assert(cdp, `Unable to get CDP session for session ${context.sessionId}`);

      const { contextOptions }: PlaywrightProviderOptions =
        context.project.config.browser.provider?.options ?? {};

      const resourceArchiver = new ResourceArchiver(
        cdp,
        options.assetDomains,
        contextOptions?.httpCredentials
      );
      resourceArchivers.set(id, resourceArchiver);

      await resourceArchiver.watch();

      networkIdleTrackers.set(
        id,
        await NetworkIdleTracker.create(cdp, options.idleNetworkInterval)
      );
    },

    /**
     * Write captured snapshots and network resources to disk.
     * Should be called only once per test as it also clears resources.
     */
    async __chromatic_writeTestResult(context, id: TestID) {
      const entity = context.project.vitest.state.getReportedEntityById(id);
      assert(
        entity?.type === 'test',
        `Expected entity with id ${id} to be a test, found ${entity?.type}`
      );

      const { archive, sessionSnapshots } = await onTestCleanup(id);
      assert(sessionSnapshots, `No snapshots found for test ${id}`);

      const snapshotBuffers: DOMSnapshots = {};

      for (const [name, { snapshot, viewport, pseudoClassIds }] of sessionSnapshots) {
        snapshotBuffers[name] = {
          snapshot: Buffer.from(JSON.stringify(snapshot)),
          viewport,
          pseudoClassIds,
        };
      }

      await writeTestResult(
        {
          outputDir: resolve(context.project.vitest.config.root, options.outputDirectory),
          pageUrl: context.page.url(),
          titlePath: getTitlePath(entity, options.formatTitle),
        },
        snapshotBuffers,
        archive,
        {
          delay: options.delay,
          diffIncludeAntiAliasing: options.diffIncludeAntiAliasing,
          diffThreshold: options.diffThreshold,
          forcedColors: options.forcedColors,
          pauseAnimationAtEnd: options.pauseAnimationAtEnd,
          prefersReducedMotion: options.prefersReducedMotion,
          cropToViewport: options.cropToViewport,
          ignoreSelectors: options.ignoreSelectors,
        }
      );
    },

    /**
     * Clear test state without writing test results.
     */
    async __chromatic_stopWithoutSnapshots(_, id: TestID) {
      await onTestCleanup(id);
    },

    /**
     * Reset all state of the plugin. Should be called between test runs.
     */
    async __chromatic_reset() {
      resourceArchivers.clear();
      networkIdleTrackers.clear();
      snapshots.clear();
    },

    /**
     * Get currently save snapshots. Used only during testing.
     * @internal
     */
    async __chromatic_getSnapshots(_, id: string) {
      return Object.fromEntries(snapshots.get(id) || []);
    },
  } satisfies Record<ChromaticNamespace, BrowserCommand<any>>;

  async function onTestCleanup(id: TestID) {
    const resourceArchiver = resourceArchivers.get(id);
    assert(resourceArchiver, `No resource archiver found for test ${id}`);

    resourceArchivers.delete(id);
    await resourceArchiver.unwatch();

    const networkIdleTracker = networkIdleTrackers.get(id);
    networkIdleTrackers.delete(id);
    await networkIdleTracker?.off();

    const sessionSnapshots = snapshots.get(id);
    snapshots.delete(id);

    return { archive: resourceArchiver.archive, sessionSnapshots };
  }
}

function getTitlePath(test: TestCase, formatTitle?: ResolvedOptions['formatTitle']): string[] {
  const defaultTitlePath = getNames(test);
  if (!formatTitle) return defaultTitlePath;

  const projectName =
    test.project.vitest.projects.length > 1 && test.project.name ? test.project.name : undefined;
  const projectOffset = projectName ? 1 : 0;

  return [
    formatTitle({
      filePath: defaultTitlePath[projectOffset] ?? '',
      testPath: defaultTitlePath.slice(projectOffset + 1),
      projectName,
    }),
  ];
}

function getNames(test: TestCase): string[] {
  const names = [test.name];
  let current: TestCase | TestSuite | TestModule = test;

  while ('parent' in current && current.parent) {
    current = current.parent;

    if ('name' in current && current.name) {
      names.unshift(current.name);
    }
  }

  if (current.type === 'module') {
    names.unshift(current.relativeModuleId);
  }

  // If Vitest was configured with multiple projects, namespace the results with project name
  const hasManyProjects =
    test.project.vitest.projects.filter((project) => project.config.browser.name === 'chromium')
      .length > 1;

  if (hasManyProjects && test.project.name) {
    names.unshift(test.project.name);
  }

  return names;
}

/** @internal */
declare module 'vitest/browser' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface BrowserCommands extends ChromaticCommands {}
}

type ChromaticCommands = {
  [K in keyof ReturnType<typeof createCommands>]: ClientCommand<
    ReturnType<typeof createCommands>[K]
  >;
};

type ClientCommand<T> = T extends (context: any, ...args: infer A) => infer R
  ? (...args: A) => R
  : T;
