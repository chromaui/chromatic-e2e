import assert from 'node:assert';
import { resolve } from 'node:path';
import { storyNameFromExport, toId } from 'storybook/internal/csf';
import type {
  TestCase,
  TestModule,
  TestSuite,
  BrowserCommand,
  BrowserCommandContext,
} from 'vitest/node';
import { type PlaywrightProviderOptions } from '@vitest/browser-playwright';
import { type Task } from '@vitest/runner/types';
import { type serializedNodeWithId } from '@rrweb/types';
import { ResourceArchiver, writeTestResult, type DOMSnapshots } from '@chromatic-com/shared-e2e';
import {
  type StoryParameters,
  type ChromaticNamespace,
  type ConfigureOptions,
  type ResolvedOptions,
} from '../types';
import { NetworkIdleTracker } from './NetworkIdleTracker';
import { ChromaticReporter } from './reporter';

type TestID = Task['id'];
type SessionId = BrowserCommandContext['sessionId'];
type SnapshotName = keyof DOMSnapshots;

export function createCommands(options: ResolvedOptions) {
  const resourceArchivers = new Map<SessionId, ResourceArchiver>();
  const networkIdleTrackers = new Map<SessionId, NetworkIdleTracker>();
  const savedResults = new Set<string>();
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
      const entity = context.project.vitest.state.getReportedEntityById(id);
      assert(
        entity?.type === 'test',
        `Expected entity with id ${id} to be a test, found ${entity?.type}`
      );

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

      ChromaticReporter.onSnapshot(context.project.vitest, entity);
    },

    /**
     * Wait for network to be idle, meaning no new network requests for at least `idleNetworkInterval` ms.
     * Use `timeout` argument to reject if network doesn't become idle within given time.
     */
    async __chromatic_waitForIdleNetwork(context, timeout: number): Promise<void> {
      const networkIdleTracker = networkIdleTrackers.get(context.sessionId);
      assert(networkIdleTracker, `No network idle tracker found for session ${context.sessionId}`);

      await networkIdleTracker.waitForIdle(timeout);
    },

    /**
     * Start recording HTTP resources and network activity for given test.
     */
    async __chromatic_interceptFetch(context) {
      // Network intercetion is shared per browser context as browser cache
      // is shared between test cases and test files that run in same browser context.
      let resourceArchiver = resourceArchivers.get(context.sessionId);
      let networkIdleTracker = networkIdleTrackers.get(context.sessionId);
      let cdp;

      if (!resourceArchiver || !networkIdleTracker) {
        cdp = await context.provider.getCDPSession?.(context.sessionId);
        assert(cdp, `Unable to get CDP session for session ${context.sessionId}`);
      }

      if (!resourceArchiver) {
        const { contextOptions }: PlaywrightProviderOptions =
          context.project.config.browser.provider?.options ?? {};

        resourceArchiver = new ResourceArchiver(
          cdp,
          options.assetDomains,
          contextOptions?.httpCredentials,
          new URL(context.page.url())
        );

        resourceArchivers.set(context.sessionId, resourceArchiver);
      }

      if (!networkIdleTracker) {
        networkIdleTracker = await NetworkIdleTracker.create(cdp, options.idleNetworkInterval);
        networkIdleTrackers.set(context.sessionId, networkIdleTracker);
      }

      await networkIdleTracker.watch();
      await resourceArchiver.watch();
    },

    /**
     * Write captured snapshots and network resources to disk.
     * Should be called only once per test as it also clears resources.
     */
    async __chromatic_writeTestResult(context, id: TestID, testOptions: ConfigureOptions = {}) {
      const entity = context.project.vitest.state.getReportedEntityById(id);
      assert(
        entity?.type === 'test',
        `Expected entity with id ${id} to be a test, found ${entity?.type}`
      );

      const { archive, sessionSnapshots } = await onTestCleanup(context, id);
      assert(sessionSnapshots, `No snapshots found for test ${id}`);

      const snapshotBuffers: DOMSnapshots = {};
      const titlePath = testOptions.title ? [testOptions.title] : getTitle(entity);

      for (const [name, { snapshot, viewport, pseudoClassIds }] of sessionSnapshots) {
        const names = generateUniqueSnapshotName({
          snapshotName: getSnapshotPrefix(entity).concat(name),
          titlePath,
        });

        snapshotBuffers[names] = {
          snapshot: Buffer.from(JSON.stringify(snapshot)),
          viewport,
          pseudoClassIds,
          parameters: {
            chromatic: {
              vitest: {
                suites: getSuiteNames(entity),
                test: entity.name,
                snapshot: name,
              },
            },
          } satisfies StoryParameters,
        };
      }

      await writeTestResult(
        {
          outputDir: resolve(context.project.vitest.config.root, options.outputDirectory),
          pageUrl: context.page.url(),
          titlePath,
        },
        snapshotBuffers,
        archive,
        {
          delay: testOptions.delay ?? options.delay,
          diffIncludeAntiAliasing:
            testOptions.diffIncludeAntiAliasing ?? options.diffIncludeAntiAliasing,
          diffThreshold: testOptions.diffThreshold ?? options.diffThreshold,
          forcedColors: testOptions.forcedColors ?? options.forcedColors,
          pauseAnimationAtEnd: testOptions.pauseAnimationAtEnd ?? options.pauseAnimationAtEnd,
          prefersReducedMotion: testOptions.prefersReducedMotion ?? options.prefersReducedMotion,
          cropToViewport: testOptions.cropToViewport ?? options.cropToViewport,
          ignoreSelectors: testOptions.ignoreSelectors ?? options.ignoreSelectors,
        },
        'vitest'
      );
    },

    /**
     * Clear test state without writing test results.
     */
    async __chromatic_stopWithoutSnapshots(context, id: TestID) {
      await onTestCleanup(context, id);
    },

    /**
     * Reset all state of the plugin. Should be called between test runs.
     */
    async __chromatic_reset() {
      for (const resourceArchiver of resourceArchivers.values()) {
        resourceArchiver.archive = {};
      }

      resourceArchivers.clear();
      networkIdleTrackers.clear();
      snapshots.clear();
      savedResults.clear();
    },

    /**
     * Get currently save snapshots. Used only during testing.
     * @internal
     */
    async __chromatic_getSnapshots(_, id: string) {
      return Object.fromEntries(snapshots.get(id) || []);
    },
  } satisfies Record<ChromaticNamespace, BrowserCommand<any>>;

  async function onTestCleanup(context: BrowserCommandContext, id: TestID) {
    const resourceArchiver = resourceArchivers.get(context.sessionId);
    assert(resourceArchiver, `No resource archiver found for test ${id}`);

    const networkIdleTracker = networkIdleTrackers.get(context.sessionId);
    assert(networkIdleTracker, `No network idle tracker found for test ${id}`);

    // Between test runs we only unwatch. Resources are still kept in memory, as same session
    // shares browser cache between test cases and test files.
    await resourceArchiver.unwatch();
    await networkIdleTracker.unwatch();

    // Snapshots are per test case:
    const sessionSnapshots = snapshots.get(id);
    snapshots.delete(id);

    return { archive: resourceArchiver.archive, sessionSnapshots };
  }

  function generateUniqueSnapshotName(options: { snapshotName: string[]; titlePath: string[] }) {
    const names = options.snapshotName.join(' / ');
    const base = toId(options.titlePath.join(' / '), storyNameFromExport(names));

    let key = base;
    let count = 1;

    while (savedResults.has(key)) {
      key = `${base} (${count++})`;
    }
    savedResults.add(key);

    if (count > 1) {
      return `${names} (${count})`;
    }

    return names;
  }
}

function getTitle(test: TestCase): string[] {
  const names = [removeFileExtensions(test.module.relativeModuleId)];

  // If Vitest was configured with multiple projects, namespace the results with project name
  const hasManyProjects =
    test.project.vitest.projects.filter((project) => project.config.browser.name === 'chromium')
      .length > 1;

  if (hasManyProjects && test.project.name) {
    names.unshift(test.project.name);
  }

  return names;
}

function getSnapshotPrefix(test: TestCase): string[] {
  const names = [test.name];
  let current: TestCase | TestSuite | TestModule = test;

  while ('parent' in current && current.parent) {
    current = current.parent;

    if ('name' in current && current.name) {
      names.unshift(current.name);
    }
  }

  return names;
}

function getSuiteNames(test: TestCase): string[] {
  if (test.parent.type !== 'suite') {
    return [];
  }

  const names = [];
  let current: TestCase | TestSuite | TestModule = test;

  while ('parent' in current && current.parent) {
    current = current.parent;

    if (current.type === 'suite') {
      names.unshift(current.name);
    }
  }

  return names;
}

function removeFileExtensions(filepath: string) {
  const parts = filepath.split('/');
  const filename = parts.pop() || '';

  return parts
    .concat(
      // Trim filenames like "src/components/accordion/Accordion.browser.spec.tsx" -> "src/components/accordion/Accordion"
      filename.split('.')[0]
    )
    .join('/');
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
