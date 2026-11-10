// v8 ignore file
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

/**
 * Static file server that serves files from multiple directories as if they were one.
 * Earlier `roots` take precedence, like archives copied over the prebuilt Storybook.
 */
export async function startServer(roots: string[]) {
  const server = createServer(async (request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    const file = await resolveFile(roots, decodeURIComponent(pathname));

    if (!file) {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, {
      "Content-Type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function resolveFile(roots: string[], pathname: string) {
  const relative = pathname.endsWith("/") ? `${pathname}index.html` : pathname;

  for (const root of roots) {
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
