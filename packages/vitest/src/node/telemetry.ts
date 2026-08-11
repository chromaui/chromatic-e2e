import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import util from 'node:util';
import { appendFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { x } from 'tinyexec';
import { env, isCI, nodeVersion } from 'std-env';
import type { Vitest } from 'vitest/node';
import type { ConfigureOptions, Options, ResolvedOptions } from '../types';
import { version as pluginVersion } from '../../package.json';

const EVENT_TYPE_PREFIX = 'vitest_';
const TELEMETRY_FETCH_TIMEOUT_MS = 5_000;
export const TELEMETRY_URL = 'https://analytics.chromatic.com';
export const TELEMETRY_LOG_FILE = 'telemetry.jsonl';
export const TELEMETRY_METADATA_FILE = 'telemetry-metadata.json';

const userAgentMatch = env.npm_config_user_agent?.match(/^([^/\s]+)\/(\S+)/);
const packageManager = {
  name: userAgentMatch?.[1] || 'unknown',
  version: userAgentMatch?.[2] || 'unknown',
};

/** @internal */
export const session = {
  id: randomUUID() as string,
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

  /** Whether internal `.vitest/chromatic/metadata.json` has been written */
  isMetadataWritten: false,

  /** Contents of `.vitest/chromatic/metadata.json` */
  telemetryMetadata: undefined as undefined | Awaited<ReturnType<typeof readTelemetryMetadata>>,

  /** Contents of `.env` */
  dotEnv: undefined as undefined | Record<string, string>,
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

export async function trackCliEvent<T extends EventType = EventType>(
  event: TelemetryEvent<T>,
  options: { outputDirectory: string }
): Promise<void> {
  if (isDisabledByEnv()) {
    return;
  }

  let telemetryMetadata = session.telemetryMetadata;

  if (session.telemetryMetadata === undefined) {
    telemetryMetadata = await readTelemetryMetadata(options.outputDirectory);
    session.telemetryMetadata = telemetryMetadata;

    if (!('disabled' in telemetryMetadata)) {
      session.id = telemetryMetadata.sessionId;
      session.projectId = telemetryMetadata.projectId;
      session.chromaticVersion = telemetryMetadata.chromaticVersion;
    }
  }

  // If we don't find telemetry metadata written by Vitest test run, we consider telemetry to be disabled.
  if (!telemetryMetadata || 'disabled' in telemetryMetadata) {
    return;
  }

  await _trackEvent(
    event,
    {
      version: telemetryMetadata.vitestVersion || 'unknown',
      config: { root: options.outputDirectory },
      projects: telemetryMetadata.isVitestProjects ? [1, 2] : [],
    },
    {
      outputDirectory: options.outputDirectory,
      telemetry: { enabled: true, logToFile: telemetryMetadata.logToFile },
    }
  );
}

async function _trackEvent(
  event: TelemetryEvent,
  vitest: {
    version: Vitest['version'];
    config: Pick<Vitest['config'], 'root'>;
    projects: unknown[];
  },
  options: Pick<ResolvedOptions, 'outputDirectory' | 'telemetry'>
) {
  const url = getEnv('CHROMATIC_TELEMETRY_URL') || TELEMETRY_URL;
  const root = vitest.config.root;
  const timestamp = new Date().toISOString();
  const outputDirectory = resolve(root, options.outputDirectory);

  session.projectId ||= await createProjectId(root);
  session.chromaticVersion ||= getChromaticVersion(root);

  const wireEvent: WireTelemetryEvent = {
    id: randomUUID(),
    sessionId: session.id,
    projectId: session.projectId,
    timestamp,
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

  if (wireEvent.level === 'error' && 'error' in wireEvent.payload) {
    wireEvent.payload.error = sanitizeError(wireEvent.payload.error);
  }

  let error: string | undefined = undefined;

  try {
    await fetch(`${url}/telemetry/v1/vitest/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wireEvent),
      signal: AbortSignal.timeout(TELEMETRY_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  if (options.telemetry.logToFile) {
    const logFile = resolve(outputDirectory, TELEMETRY_LOG_FILE);

    await mkdir(outputDirectory, { recursive: true });
    await appendFile(logFile, `${JSON.stringify(wireEvent)}\n`, 'utf8');

    if (error) {
      await appendFile(logFile, `${JSON.stringify({ telemetryPostError: error })}\n`, 'utf8');
    }
  }

  if (!session.isMetadataWritten) {
    session.isMetadataWritten = true;

    await writeTelemetryMetadata(outputDirectory, {
      ...wireEvent.metadata,
      sessionId: wireEvent.sessionId,
      projectId: wireEvent.projectId,
      logToFile: options.telemetry.logToFile,
    });
  }
}

export function resolveTelemetryOptions(
  telemetry: Options['telemetry']
): ResolvedOptions['telemetry'] {
  const resolved =
    typeof telemetry === 'object'
      ? { enabled: telemetry?.enabled ?? true, logToFile: telemetry?.logToFile ?? false }
      : { enabled: telemetry ?? true, logToFile: false };

  if (isDisabledByEnv()) {
    resolved.enabled = false;
  }

  if (isTruthyEnv(getEnv('CHROMATIC_TELEMETRY_LOG_TO_FILE'))) {
    resolved.logToFile = true;
  }

  return resolved;
}

function isDisabledByEnv() {
  return isTruthyEnv(getEnv('CHROMATIC_DISABLE_TELEMETRY')) || isTruthyEnv(getEnv('DO_NOT_TRACK'));
}

/**
 * Delete the telemetry log files just once per session
 */
export function cleanTelemetryLogFiles(outputDirectory: string): void {
  if (session.cleanedLogFileDirectories.has(outputDirectory)) {
    return;
  }
  session.cleanedLogFileDirectories.add(outputDirectory);

  rmSync(resolve(outputDirectory, TELEMETRY_LOG_FILE), { force: true });
  rmSync(resolve(outputDirectory, TELEMETRY_METADATA_FILE), { force: true });
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

    session.isMetadataWritten = false;
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

/**
 * Writes a `.vitest/chromatic/metadata.json` file with the given telemetry metadata.
 * This file will be picked up when `chromatic --vitest` CLI is run, outside of Vitest test run.
 * It allows us to share telemetry metadata between Vitest and Chromatic CLI processes.
 */
async function writeTelemetryMetadata(
  outputDirectory: string,
  data: WireTelemetryEvent['metadata'] &
    Pick<WireTelemetryEvent, 'sessionId' | 'projectId'> &
    Pick<ResolvedOptions['telemetry'], 'logToFile'>
) {
  await writeFile(
    resolve(outputDirectory, TELEMETRY_METADATA_FILE),
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

/**
 * Reads the `.vitest/chromatic/metadata.json` file and returns the telemetry metadata.
 * This will be read when `chromatic --vitest` CLI is run, outside of Vitest test run.
 */
async function readTelemetryMetadata(
  outputDirectory: string
): Promise<{ disabled: true } | Parameters<typeof writeTelemetryMetadata>[1]> {
  try {
    const content = await readFile(resolve(outputDirectory, TELEMETRY_METADATA_FILE), 'utf8');

    return JSON.parse(content);
  } catch {
    // Missing (or malformed) metadata indicates telemetry was disabled during Vitest run.
    return { disabled: true };
  }
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error && error.stack) {
    const raw = error.stack.includes(error.message)
      ? error.stack
      : `${error.message}\nStack: ${error.stack}`;

    return sanitizeString(raw).slice(0, 2000);
  }

  return sanitizeString(error instanceof Error ? error.message : String(error)).slice(0, 1000);
}

function sanitizeString(value: string): string {
  return value
    .replaceAll(sep, '/')
    .replace(toPathRegExp(process.cwd()), '<process-cwd>')
    .replace(toPathRegExp(homedir()), '<homedir>');
}

function toPathRegExp(path: string): RegExp {
  const normalized = path.replaceAll(sep, '/');
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(escaped, 'gi');
}

function getEnv(name: string): string | undefined {
  if (session.dotEnv === undefined) {
    // Supported in LTS 22 and EOL 20.12
    if (typeof util.parseEnv !== 'function') {
      session.dotEnv = {};
    } else {
      try {
        session.dotEnv = util.parseEnv(readFileSync(resolve(process.cwd(), '.env'), 'utf8'));
      } catch {
        session.dotEnv = {};
      }
    }
  }

  return env[name] ?? session.dotEnv[name];
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
    archiveCount: number;
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
