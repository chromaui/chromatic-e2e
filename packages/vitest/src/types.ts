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
}

/** Options that don't have internal default values */
type UnresolvedOptionKeys = Exclude<keyof ChromaticConfig, 'resourceArchiveTimeout'>;

/** Options with resolved values - derived from internal default values when not passed by user. */
type ResolvedOptionKeys = Exclude<keyof Options, UnresolvedOptionKeys>;

/** @internal */
export interface ResolvedOptions
  extends Required<Pick<Options, ResolvedOptionKeys>>,
    Pick<Options, UnresolvedOptionKeys> {}

/** @internal */
type InternalMeta = Record<ChromaticNamespace, unknown> & {
  /** Indicates whether Visual Regression tracking is registered */
  __chromatic_isRegistered?: boolean;

  /** Indicates whether `takeSnapshot()` has been called */
  __chromatic_isTakeSnapshotCalled?: boolean;

  /** Pending `takeSnapshot()` promises */
  __chromatic_pendingTakeSnapshots?: { promise: Promise<void>; error: Error }[];
};

/** @internal */
export interface InternalTestContext {
  task: { meta: InternalMeta };
}
