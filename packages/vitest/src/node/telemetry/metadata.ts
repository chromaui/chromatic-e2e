import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { env } from "std-env";
import { x } from "tinyexec";

import { TELEMETRY_METADATA_FILE } from "./constants";
import type { WireTelemetryEvent } from "./types";

const userAgentMatch = env.npm_config_user_agent?.match(/^([^/\s]+)\/(\S+)/);

export const packageManager = {
  name: userAgentMatch?.[1] || "unknown",
  version: userAgentMatch?.[2] || "unknown",
};

/** Contents of the `.vitest/chromatic/telemetry-metadata.json` file shared between Vitest and Chromatic CLI processes. */
export interface TelemetryMetadata {
  sessionId: WireTelemetryEvent["sessionId"];
  projectId: WireTelemetryEvent["projectId"];
  chromaticVersion: WireTelemetryEvent["metadata"]["chromaticVersion"];
  vitestVersion: WireTelemetryEvent["metadata"]["vitestVersion"];
  isVitestProjects: WireTelemetryEvent["metadata"]["isVitestProjects"];
}

export async function createProjectId(root: string): Promise<string> {
  let remote: string | undefined = undefined;

  try {
    const result = await x("git", ["remote", "get-url", "origin"], { nodeOptions: { cwd: root } });
    remote = result.exitCode === 0 ? result.stdout.trim().toLowerCase() : undefined;
  } catch {
    // Ignore tinyexec spawn errors, fallback logic
  }

  // Fallback to hashing the root path without git
  if (!remote) {
    return hash(root);
  }

  const hasProtocol = remote.includes("://");

  remote = remote
    .replace(/^[a-z+]+:\/\//, "") // Protocol, e.g. "https://" or "ssh://"
    .replace(/^[^@/]+@/, ""); // Credentials, e.g. "git@" or "user:token@"

  if (!hasProtocol) {
    // SCP-like form "github.com:org/repo" after credential strip
    remote = remote.replace(":", "/");
  }

  remote = remote.replace(/\.git$/, "").replace(/\/+$/, "");

  return hash(remote);
}

function hash(value: string): string {
  return createHash("sha256").update(`chromatic-vitest-telemetry-v1:${value}`).digest("hex");
}

export function getChromaticVersion(root: string) {
  try {
    const require = createRequire(join(root, "package.json"));
    return require("chromatic/package.json").version || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Writes a `.vitest/chromatic/telemetry-metadata.json` file with the given telemetry metadata.
 * This file will be picked up when `chromatic --vitest` CLI is run, outside of Vitest test run.
 * It allows us to share telemetry metadata between Vitest and Chromatic CLI processes.
 */
export async function writeTelemetryMetadata(outputDirectory: string, data: TelemetryMetadata) {
  await writeFile(
    resolve(outputDirectory, TELEMETRY_METADATA_FILE),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

/**
 * Reads the `.vitest/chromatic/telemetry-metadata.json` file and returns the telemetry metadata.
 * This will be read when `chromatic --vitest` CLI is run, outside of Vitest test run.
 */
export async function readTelemetryMetadata(outputDirectory: string): Promise<TelemetryMetadata> {
  const defaults: TelemetryMetadata = {
    sessionId: "unknown",
    projectId: "unknown",
    chromaticVersion: "unknown",
    vitestVersion: "unknown",
    isVitestProjects: false,
  };

  try {
    const filename = resolve(outputDirectory, TELEMETRY_METADATA_FILE);

    if (!existsSync(filename)) {
      return defaults;
    }

    const content = await readFile(filename, "utf8");
    const json = JSON.parse(content);

    return { ...defaults, ...json };
  } catch {
    return defaults;
  }
}
