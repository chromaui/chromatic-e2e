import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo, isIP } from "node:net";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

// @ts-expect-error -- untyped
import mime from "mime";

import { archivesDir as resolveArchivesDir, checkArchivesDirExists } from "../utils/filePaths";
import { STORIES_FILE_EXT } from "../write-archive/stories-files";
import { generateStoryIndex } from "../write-archive/story-index";
import type { Logger } from "./cli";

export const DEFAULT_PORT = 6006;

/** How many ports after the default port are tried when it's in use */
const MAX_PORT_ATTEMPTS = 100;

/** Prebuilt files that the archives must not override, like with `build-archive-storybook` */
const RESERVED_FILES = ["/index.html", "/iframe.html"];

// From "[::1]" to "::1"
const IPV6_BRACKETS_PATTERN = /^\[(.*)\]$/;

interface Options {
  /** Prebuilt Storybook shipped in the package's `dist/storybook-static` */
  storybookDir: string;

  /** The package's default directory for test results, overridden by `CHROMATIC_ARCHIVE_LOCATION` */
  defaultOutputDir: string;

  port: number;

  /** When `false`, the next free port is used if `port` is in use */
  strictPort: boolean;

  host: string;

  logger: Logger;
}

interface Callbacks {
  onArchivesCheck?: (error?: unknown) => void;
}

/**
 * Starts a static server for the archive Storybook, without copying any files.
 * Serves the same files as `build-archive-storybook` writes into its output directory:
 *
 * - `/index.json`, generated per request from the `*.stories.json` files, so it's never stale
 * - `/<name>.stories.json` from the archives directory
 * - Snapshots and assets from the archives' `archive` directory
 * - The prebuilt Storybook
 */
export async function startArchiveStorybook(options: Options, callbacks?: Callbacks) {
  const { logger } = options;
  const projectRoot = process.cwd();
  const archivesDir = resolveArchivesDir(options.defaultOutputDir);

  try {
    checkArchivesDirExists(archivesDir);
    callbacks?.onArchivesCheck?.();
  } catch (error) {
    callbacks?.onArchivesCheck?.(error);
    throw error;
  }

  const roots = {
    storybook: options.storybookDir,
    stories: archivesDir,
    assets: path.join(archivesDir, "archive"),
  };

  const server = createServer((request, response) => {
    handleRequest({ request, response, roots, projectRoot, host: options.host, logger }).catch(
      (error) => {
        logger.error(
          `Failed to serve ${request.url}: ${error instanceof Error ? error.message : error}`,
        );

        if (!response.headersSent) {
          response.writeHead(500, { "Content-Type": "text/plain" });
        }

        response.end(error instanceof Error ? error.message : String(error));
      },
    );
  });

  const port = await listen(server, options);
  // When listening on all interfaces, open via localhost locally and via IP address from other devices
  const isUnspecifiedHost = options.host === "0.0.0.0" || options.host === "::";
  const url = formatUrl(isUnspecifiedHost ? "localhost" : options.host, port);
  const networkAddress = isUnspecifiedHost ? getNetworkAddress() : undefined;

  logger.output(
    formatReadyMessage({
      url,
      networkUrl: networkAddress && formatUrl(networkAddress, port),
      archivesDir: path.relative(projectRoot, archivesDir),
    }),
  );

  return {
    url,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function handleRequest(options: {
  request: IncomingMessage;
  response: ServerResponse;
  roots: { storybook: string; stories: string; assets: string };
  projectRoot: string;
  host: string;
  logger: Logger;
}) {
  const { request, response, roots, logger } = options;

  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  if (!isAllowedHost(request.headers.host, options.host)) {
    logger.warn(`Blocked request with Host header '${request.headers.host}'`);
    response
      .writeHead(403, { "Content-Type": "text/plain" })
      .end(
        `Blocked request. Host '${request.headers.host}' is not allowed, start archive-storybook with --host to allow it.`,
      );
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }

  let pathname: string;

  try {
    pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  if (pathname === "/index.json") {
    const index = await generateStoryIndex({
      archivesDir: roots.stories,
      projectRoot: options.projectRoot,
    });

    logger.debug(`200 ${pathname}`);
    response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-cache" });
    response.end(request.method === "HEAD" ? undefined : JSON.stringify(index));
    return;
  }

  const file = await resolveFile(roots, pathname);

  if (!file) {
    logger.debug(`404 ${pathname}`);
    response.writeHead(404).end();
    return;
  }

  logger.debug(`200 ${pathname} -> ${file}`);
  response.writeHead(200, {
    "Content-Type": mime.getType(file) ?? "application/octet-stream",
    // Archives change between test runs
    "Cache-Control": "no-cache",
  });

  if (request.method === "HEAD") {
    response.end();
  } else {
    await pipeline(createReadStream(file), response).catch((error) => {
      // Browser cancelled the request, e.g. when navigating away while assets are loading
      if (error?.code === "ERR_STREAM_PREMATURE_CLOSE") {
        logger.debug(`Request cancelled ${pathname}`);
        return;
      }

      throw error;
    });
  }
}

/**
 * Resolves the file in the same order as `build-archive-storybook` copies them over each other:
 * archived assets win over stories files, which win over the prebuilt Storybook.
 */
async function resolveFile(
  roots: { storybook: string; stories: string; assets: string },
  pathname: string,
) {
  const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const candidates: string[] = [];

  if (!RESERVED_FILES.includes(relative)) {
    candidates.push(roots.assets);

    // Stories files are served flat next to `iframe.html`
    if (path.posix.dirname(relative) === "/" && relative.endsWith(STORIES_FILE_EXT)) {
      candidates.push(roots.stories);
    }
  }

  candidates.push(roots.storybook);

  for (const root of candidates) {
    const file = path.join(root, relative);

    // Prevent path traversal outside the root
    if (!file.startsWith(root + path.sep)) {
      continue;
    }

    const stats = await stat(file).catch((): undefined => undefined);

    if (stats?.isFile()) {
      return file;
    }
  }
}

/** Box like the one `storybook dev` prints when it's ready */
export function formatReadyMessage(options: {
  url: string;
  networkUrl?: string;
  archivesDir: string;
}) {
  const rows = [
    ["Local:", options.url],
    ...(options.networkUrl ? [["On your network:", options.networkUrl]] : []),
    ["Archives:", options.archivesDir],
  ];
  const labelWidth = Math.max(...rows.map(([label]) => label.length));

  const lines = [
    "Storybook ready!",
    "",
    ...rows.map(([label, value]) => `- ${label.padEnd(labelWidth)}   ${value}`),
  ];
  const width = Math.max(...lines.map((line) => line.length));

  return [
    `╭${"─".repeat(width + 6)}╮`,
    ...lines.map((line) => `│   ${line.padEnd(width)}   │`),
    `╰${"─".repeat(width + 6)}╯`,
  ].join("\n");
}

function formatUrl(host: string, port: number) {
  return `http://${isIP(host) === 6 ? `[${host}]` : host}:${port}/`;
}

/** First external IPv4 address of the machine, for opening the server from other devices */
function getNetworkAddress() {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
}

export function isAllowedHost(hostHeader: string | undefined, host: string) {
  if (!hostHeader) return false;

  let hostname: string;

  try {
    hostname = new URL(`http://${hostHeader}`).hostname;
  } catch {
    return false;
  }

  if (isIP(hostname.replace(IPV6_BRACKETS_PATTERN, "$1"))) return true;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;

  return hostname === host.toLowerCase();
}

async function listen(server: Server, options: Pick<Options, "port" | "strictPort" | "host">) {
  for (let port = options.port; ; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, options.host, () => {
          server.off("error", reject);
          resolve();
        });
      });

      return (server.address() as AddressInfo).port;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") {
        throw error;
      }

      if (options.strictPort) {
        throw new Error(`Port ${port} is already in use. Pass another --port.`);
      }

      if (port >= options.port + MAX_PORT_ATTEMPTS) {
        throw new Error(
          `No free port found between ${options.port} and ${port}. Pass another --port.`,
        );
      }
    }
  }
}
