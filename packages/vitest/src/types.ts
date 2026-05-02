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
   * Format the Storybook title path used for this test's snapshots.
   * By default this is `[projectName?, filePath, ...testPath]`.
   */
  formatTitlePath?: (context: {
    filePath: string;
    testPath: string[];
    projectName?: string;
    defaultTitlePath: string[];
  }) => string[];
}

/** Options that don't have internal default values */
type UnresolvedOptionKeys =
  | 'tags'
  | 'formatTitlePath'
  | Exclude<keyof ChromaticConfig, 'resourceArchiveTimeout'>;

/** Options with resolved values - derived from internal default values when not passed by user. */
type ResolvedOptionKeys = Exclude<keyof Options, UnresolvedOptionKeys>;

/** @internal */
export interface ResolvedOptions
  extends Required<Pick<Options, ResolvedOptionKeys>>, Pick<Options, UnresolvedOptionKeys> {}

/** @internal */
type InternalMeta = Record<ChromaticNamespace, unknown> & {
  /** Indicates whether Visual Regression tracking is registered */
  __chromatic_isRegistered?: boolean;

  /** Indicates whether automatic snapshotting is enabled */
  __chromatic_autoSnapshot?: boolean;

  /** Indicates whether `takeSnapshot()` has been called */
  __chromatic_isTakeSnapshotCalled?: boolean;

  /** Pending `takeSnapshot()` promises */
  __chromatic_pendingTakeSnapshots?: { promise: Promise<void>; error: Error }[];
};

/** @internal */
export interface InternalTestContext {
  task: { meta: InternalMeta };
}
