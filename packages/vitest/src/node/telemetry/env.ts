import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import util from 'node:util';
import { env } from 'std-env';
import type { Options, ResolvedOptions } from '../../types';

/** Contents of `.env` */
let dotEnv: Record<string, string> | undefined = undefined;

/** @internal Invalidate the cached `.env` contents. Used by tests. */
export function invalidateDotEnvCache(): void {
  dotEnv = undefined;
}

export function getEnv(name: string): string | undefined {
  if (dotEnv === undefined) {
    // Supported in LTS 22 and EOL 20.12
    if (typeof util.parseEnv !== 'function') {
      dotEnv = {};
    } else {
      try {
        dotEnv = util.parseEnv(readFileSync(resolve(process.cwd(), '.env'), 'utf8'));
      } catch {
        dotEnv = {};
      }
    }
  }

  return env[name] ?? dotEnv[name];
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

export function isDisabledByEnv() {
  return isTruthyEnv(getEnv('CHROMATIC_DISABLE_TELEMETRY')) || isTruthyEnv(getEnv('DO_NOT_TRACK'));
}

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value !== 'false';
}
