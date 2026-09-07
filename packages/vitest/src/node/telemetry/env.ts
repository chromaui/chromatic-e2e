import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import util from "node:util";

import { env } from "std-env";

import type { ResolvedOptions } from "../../types";

/** Contents of `.env` */
let dotEnv: Record<string, string> | undefined = undefined;

/** @internal Invalidate the cached `.env` contents. Used by tests. */
export function invalidateDotEnvCache(): void {
  dotEnv = undefined;
}

export function getEnv(name: string): string | undefined {
  if (dotEnv === undefined) {
    // Supported in LTS 22 and EOL 20.12
    if (typeof util.parseEnv !== "function") {
      dotEnv = {};
    } else {
      try {
        dotEnv = util.parseEnv(readFileSync(resolve(process.cwd(), ".env"), "utf8"));
      } catch {
        dotEnv = {};
      }
    }
  }

  return env[name] ?? dotEnv[name];
}

export function resolveTelemetryOptions(): ResolvedOptions["telemetry"] {
  return {
    // Enabled by default, disabled by env variables
    enabled:
      isTruthyEnv(getEnv("CHROMATIC_DISABLE_TELEMETRY")) === false &&
      isTruthyEnv(getEnv("DO_NOT_TRACK")) === false,

    // Disabled by default, enabled by env variable
    logToFile: isTruthyEnv(getEnv("CHROMATIC_TELEMETRY_LOG_TO_FILE")),
  };
}

function isTruthyEnv(value: string | undefined): boolean {
  return value !== undefined && value !== "" && value !== "0" && value !== "false";
}
