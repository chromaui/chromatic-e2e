/* Types consumed by both browser and Node context */

import { type ChromaticConfig } from '@chromatic-com/shared-e2e';

/**
 * Prefix to avoid conflicting with user-defined browser commands, task meta and others.
 * - The `__<namespace>_<command>` convention matches Vitest's internal commands' format
 */
export type ChromaticNamespace = `__chromatic_${string}`;

/**
 * Options for the Chromatic Vitest plugin
 */
export interface Options extends ChromaticConfig {
  /**
   * Tags used to register tests for visual regression tracking.
   * If specified, only tests with at least one matching tag will be registered for visual regression tracking.
   * Tests without any of the specified tags will be ignored and won't have snapshots taken, even if `disableAutoSnapshot` is false.
   *
   * @default none (all tests are registered)
   */
  tags?: string[];

  /**
   * Directory where temporary archives and snapshots will be stored.
   * Relative to the project [the project `root`](https://vitest.dev/config/root.html#root).
   *
   * Defaults to `.vitest/chromatic`.
   */
  outputDirectory?: string;

  /**
   * Time in milliseconds to determine whether network is idle.
   * The network is considered idle if there are no new network requests for at least this duration.
   *
   * @default 100
   */
  idleNetworkInterval?: number;

  /**
   * Logger used to report status of captured archives.
   *
   * @default true
   */
  reporter?:
    | boolean
    | {
        /**
         * Whether the reporter is enabled.
         *
         * @default true
         */
        enabled?: boolean;

        /**
         * Log information about captured archives during test run.
         *
         * @default true
         */
        verbose?: boolean;
      };
}

/** Additional `parameters` added into the Story JSON file. */
export interface StoryParameters {
  chromatic: {
    vitest: {
      /** Names of all `describe()` blocks, if any */
      suites: string[];

      /** Name of the `test()` */
      test: string;

      /** Name of the snapshot */
      snapshot: string;
    };
  };
}

/** Options that don't have internal default values */
type UnresolvedOptionKeys = 'tags' | Exclude<keyof ChromaticConfig, 'resourceArchiveTimeout'>;

/** Options with resolved values - derived from internal default values when not passed by user. */
type ResolvedOptionKeys = Exclude<keyof Options, UnresolvedOptionKeys>;

/** @internal */
export interface ResolvedOptions
  extends
    Required<Pick<Options, ResolvedOptionKeys>>,
    Pick<Options, UnresolvedOptionKeys | 'reporter'> {
  //
  reporter: Required<Exclude<Options['reporter'], boolean>>;
}

/**
 * Options that can be set per test, suite or module via `configure()`
 * - `assetDomains` is excluded as it can only be configured globally on the plugin
 */
export type ConfigureOptions = {
  /** Custom title to be shown in Chromatic. Default is derived from test file name. */
  title?: string;
} & Omit<ChromaticConfig, 'assetDomains'>;

/** @internal */
type InternalMeta = Record<ChromaticNamespace, unknown> & {
  /** Indicates whether Visual Regression tracking is registered */
  __chromatic_isRegistered?: boolean;

  /** Options for the current test, set via `configure()` */
  __chromatic_options?: ConfigureOptions;

  /** Indicates whether `takeSnapshot()` has been called */
  __chromatic_isTakeSnapshotCalled?: boolean;

  /** Pending `takeSnapshot()` promises */
  __chromatic_pendingTakeSnapshots?: { promise: Promise<void>; error: Error }[];
};

/** @internal */
export interface InternalTestContext {
  task: { meta: InternalMeta };
}
