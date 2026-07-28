import { createHash, randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { appendFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { x } from 'tinyexec';
import { env, isCI, nodeVersion } from 'std-env';
import type { Vitest } from 'vitest/node';
import { type Options, type ResolvedOptions } from '../types';
import { version as pluginVersion } from '../../package.json';

const EVENT_TYPE_PREFIX = 'ch_vitest_';
const TELEMETRY_FETCH_TIMEOUT_MS = 5_000;
export const TELEMETRY_URL = 'https://analytics.chromatic.com';
export const TELEMETRY_LOG_FILE = 'telemetry.jsonl';

const userAgentMatch = env.npm_config_user_agent?.match(/^([^/\s]+)\/(\S+)/);
const packageManager = {
  name: userAgentMatch?.[1] || 'unknown',
  version: userAgentMatch?.[2] || 'unknown',
};

const session = {
  id: randomUUID(),
  projectId: undefined as string | undefined,
  chromaticVersion: undefined as string | undefined,

  /**
   * Directories used by `telemetry.logToFile`.
   * Held in session to avoid race conditions when Vitest projects are used.
   * Multiple projects could try to clean up the same directory while other one is writing there already.
   */
  cleanedLogFileDirectories: new Set<string>(),

  /** Promises to wait before Vitest exists */
  cleanups: new Set<Promise<void>>(),

  /** Whether cleanup hooks were already registered for this session */
  cleanupRegistered: false,
};

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

/**
 * Track a telemetry event. Attaches all automatically generated fields.
 */
export function trackEvent<T extends EventType = EventType>(
  event: TelemetryEvent<T>,
  vitest: Vitest,
  options: ResolvedOptions
): void {
  if (!options.telemetry.enabled) {
    return;
  }

  const promise = _trackEvent(event, vitest, options)
    .catch(() => {})
    .finally(() => session.cleanups.delete(promise));

  session.cleanups.add(promise);
}

async function _trackEvent(event: TelemetryEvent, vitest: Vitest, options: ResolvedOptions) {
  const url = env.CHROMATIC_TELEMETRY_URL || TELEMETRY_URL;
  const root = vitest.config.root;

  session.projectId ||= await createProjectId(root);
  session.chromaticVersion ||= getChromaticVersion(root);

  const wireEvent: WireTelemetryEvent = {
    id: randomUUID(),
    sessionId: session.id,
    projectId: session.projectId,
    timestamp: new Date().toISOString(),
    eventType: `${EVENT_TYPE_PREFIX}${event.eventType}`,
    level: event.level,
    payload: event.payload,
    metadata: {
      isCI,
      pluginVersion,
      nodeVersion: nodeVersion || 'unknown',
      vitestVersion: vitest.version,
      isVitestProjects: vitest.projects.length > 1,
      packageManager: packageManager.name,
      packageManagerVersion: packageManager.version,
      chromaticVersion: session.chromaticVersion,
    },
  };

  let error: string | undefined = undefined;

  try {
    await fetch(`${url}/vitest/v1/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wireEvent),
      signal: AbortSignal.timeout(TELEMETRY_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (options.telemetry.logToFile) {
    const outputDirectory = resolve(root, options.outputDirectory);
    const logFile = resolve(outputDirectory, TELEMETRY_LOG_FILE);

    await mkdir(outputDirectory, { recursive: true });
    await appendFile(logFile, `${JSON.stringify(wireEvent)}\n`, 'utf8');

    if (error) {
      await appendFile(logFile, `${JSON.stringify({ telemetryPostError: error })}\n`, 'utf8');
    }
  }
}

export function resolveTelemetryOptions(
  telemetry: Options['telemetry']
): ResolvedOptions['telemetry'] {
  const resolved =
    typeof telemetry === 'object'
      ? { enabled: telemetry?.enabled ?? true, logToFile: telemetry?.logToFile ?? false }
      : { enabled: telemetry ?? true, logToFile: false };

  // Environment variables can only disable telemetry or enable the log file, never the reverse
  if (isTruthyEnv(env.CHROMATIC_DISABLE_TELEMETRY) || isTruthyEnv(env.DO_NOT_TRACK)) {
    resolved.enabled = false;
  }

  if (isTruthyEnv(env.CHROMATIC_TELEMETRY_LOG_TO_FILE)) {
    resolved.logToFile = true;
  }

  return resolved;
}

/**
 * Delete the telemetry log file just once per session
 */
export function cleanTelemetryLogFile(outputDirectory: string): void {
  if (session.cleanedLogFileDirectories.has(outputDirectory)) {
    return;
  }
  session.cleanedLogFileDirectories.add(outputDirectory);

  rmSync(resolve(outputDirectory, TELEMETRY_LOG_FILE), { force: true });
}

/**
 * Register a cleanup handler to run all pending telemetry cleanups on Vitest exit.
 */
export function setupTelemetryCleanup(vitest: Vitest) {
  if (session.cleanupRegistered) {
    return;
  }

  session.cleanupRegistered = true;

  vitest.onClose(async () => {
    await Promise.all(Array.from(session.cleanups.values()));
    session.cleanups.clear();

    session.cleanedLogFileDirectories.clear();
    session.cleanupRegistered = false;
  });
}

async function createProjectId(root: string): Promise<string> {
  let remote: string | undefined = undefined;

  try {
    const result = await x('git', ['remote', 'get-url', 'origin'], { nodeOptions: { cwd: root } });
    remote = result.exitCode === 0 ? result.stdout.trim().toLowerCase() : undefined;
  } catch {
    // Ignore tinyexec spawn errors, fallback logic
  }

  // Fallback to hashing the root path without git
  if (!remote) {
    return hash(root);
  }

  const hasProtocol = remote.includes('://');

  remote = remote
    .replace(/^[a-z+]+:\/\//, '') // Protocol, e.g. "https://" or "ssh://"
    .replace(/^[^@/]+@/, ''); // Credentials, e.g. "git@" or "user:token@"

  if (!hasProtocol) {
    // SCP-like form "github.com:org/repo" after credential strip
    remote = remote.replace(':', '/');
  }

  remote = remote.replace(/\.git$/, '').replace(/\/+$/, '');

  return hash(remote);
}

function hash(value: string): string {
  return createHash('sha256').update(`chromatic-vitest-telemetry-v1:${value}`).digest('hex');
}

function getChromaticVersion(root: string) {
  try {
    const require = createRequire(join(root, 'package.json'));
    return require('chromatic/package.json').version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
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
  };

  project_ineligible: {
    isBrowser: boolean;
    isChromium: boolean;
  };
};
