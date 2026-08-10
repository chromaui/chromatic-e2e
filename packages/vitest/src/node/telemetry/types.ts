/** These types are consumed by both browser and node sides */

import type { ConfigureOptions } from '../../types';
import { EVENT_TYPE_PREFIX } from './constants';

export type EventType = keyof TelemetryPayloads;

/** Telemetry event before automatically generated fields are attached. */
export interface TelemetryEvent<T extends EventType = EventType> {
  eventType: T;
  level: 'info' | 'warn' | 'error';
  payload: TelemetryPayloads[T];
}

/** Telemetry event in the exact shape it leaves the process. */
export interface WireTelemetryEvent<T extends EventType = EventType> extends Omit<
  TelemetryEvent<T>,
  'eventType'
> {
  id: string;
  sessionId: string;
  projectId: string;
  timestamp: string;
  eventType: `${typeof EVENT_TYPE_PREFIX}${T}`;
  metadata: {
    pluginVersion: string;
    vitestVersion: string;
    chromaticVersion: string;
    nodeVersion: string;
    packageManager: string;
    packageManagerVersion: string;
    isCI: boolean;
    isVitestProjects: boolean;
  };
}

type TelemetryPayloads = {
  plugin_configured: {
    disableAutoSnapshot: boolean;
    isCustomOutputDirectory: boolean;
    resourceArchiveTimeout: number;
    idleNetworkInterval: number;
    turboSnap: boolean;
    reporter: 'verbose' | 'non-verbose' | 'off';
    tagsCount: number | undefined;
    delay: number | undefined;
    diffIncludeAntiAliasing: boolean | undefined;
    diffThreshold: number | undefined;
    forcedColors: string | undefined;
    pauseAnimationAtEnd: boolean | undefined;
    prefersReducedMotion: string | undefined;
    cropToViewport: boolean | undefined;
    assetDomainsCount: number;
    ignoreSelectorsCount: number;
    isShardedRun: boolean;
  };

  project_ineligible: {
    isBrowser: boolean;
    isChromium: boolean;
  };

  run_started: Record<string, never>;

  run_ended: {
    snapshotCount: number;
  };

  snapshot_captured: {
    isCustomName: boolean;
    colorScheme: string;
    isAutomaticSnapshot: boolean;
  };

  take_snapshot_invalid_call: {
    isInsideTest: boolean;
    isRegisteredTest: boolean | undefined;
    isAwaited: boolean | undefined;
  };

  archives_created: {
    count: number;
  };

  configure_called: {
    options: (keyof ConfigureOptions)[];
    scope: 'test' | 'suite' | 'file';
  };

  wait_for_idle_network_called: {
    timeout: number;
  };

  wait_for_idle_network_invalid_call: {
    isInsideTest: boolean;
    isRegisteredTest: boolean | undefined;
    isCalledByUser: boolean;
  };

  wait_for_idle_network_timeout: {
    timeout: number;
    isCalledByUser: boolean;
  };

  setup_files_parallel: {
    setupFileCount: number;
  };

  tags_low_version: Record<string, unknown>;

  archives_resolved: {
    isCustomLocation: boolean;
    success: boolean;
    command: 'archiveStorybook' | 'buildArchiveStorybook';
  };

  storybook_build_started: {
    isCalledFromCLI: boolean;
  };

  storybook_build_completed: {
    success: boolean;
    error: unknown;
  };

  storybook_dev_started: Record<string, never>;

  storybook_dev_failed: {
    error: unknown;
  };
};
