import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, get } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { expect, onTestFinished, test as base, vi } from "vitest";

import { createLogger } from "./cli";
import { formatReadyMessage, isAllowedHost, startArchiveStorybook } from "./dev";

const DEFAULT_OUTPUT_DIR = "test-results";

type StartOptions = Parameters<typeof startArchiveStorybook>[0];
type StartCallbacks = Parameters<typeof startArchiveStorybook>[1];

const test = base
  .extend("projectRoot", async ({}, { onCleanup }) => {
    const projectRoot = await mkdtemp(join(tmpdir(), "archive-storybook-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(projectRoot);

    onCleanup(async () => {
      cwd.mockRestore();
      await rm(projectRoot, { recursive: true, force: true });
    });

    return projectRoot;
  })
  .extend("storybookDir", async ({ projectRoot }) => {
    const storybookDir = join(
      projectRoot,
      "node_modules/@chromatic-com/vitest/dist/storybook-static",
    );

    await writeFiles(storybookDir, {
      "index.html": "prebuilt index.html",
      "iframe.html": "prebuilt iframe.html",
      "index.json": JSON.stringify({ v: 5, entries: {} }),
      "favicon.svg": "prebuilt favicon",
      "sb-manager/runtime.js": "prebuilt runtime",
    });

    return storybookDir;
  })
  .extend("archivesDir", { auto: true }, async ({ projectRoot }) => {
    const archivesDir = join(projectRoot, DEFAULT_OUTPUT_DIR, "chromatic-archives");

    await writeFiles(archivesDir, {
      "button.stories.json": JSON.stringify({ title: "button", stories: [{ name: "primary" }] }),
      "archive/button-primary.w1280h720.snapshot.json": "snapshot",
      "archive/localhost-3000/image.png": "image",
      "archive/favicon.svg": "archived favicon",
      "archive/index.html": "archived index.html",
    });

    return archivesDir;
  })
  .extend("start", async ({ storybookDir }, { onCleanup }) => {
    const servers: { close: () => Promise<void> }[] = [];
    onCleanup(async () => {
      await Promise.all(servers.map((server) => server.close()));
    });

    return async function start(overrides: Partial<StartOptions> = {}, callbacks?: StartCallbacks) {
      const server = await startArchiveStorybook(
        {
          storybookDir,
          defaultOutputDir: DEFAULT_OUTPUT_DIR,
          port: 0,
          strictPort: true,
          host: "127.0.0.1",
          logger: createLogger("silent"),
          ...overrides,
        },
        callbacks,
      );

      servers.push(server);

      return server;
    };
  })
  .extend("server", async ({ start }) => start());

test("serves prebuilt Storybook", async ({ server }) => {
  expect(await text(server.url, "sb-manager/runtime.js")).toBe("prebuilt runtime");
  expect(await text(server.url, "iframe.html")).toBe("prebuilt iframe.html");
});

test("serves index.html for /", async ({ server }) => {
  expect(await text(server.url, "")).toBe("prebuilt index.html");
});

test("serves stories files from archives", async ({ server }) => {
  const response = await fetch(new URL("button.stories.json", server.url));

  expect(response.headers.get("content-type")).toBe("application/json");
  expect(await response.json()).toEqual({ title: "button", stories: [{ name: "primary" }] });
});

test("serves archived snapshots and assets", async ({ server }) => {
  expect(await text(server.url, "button-primary.w1280h720.snapshot.json")).toBe("snapshot");

  const image = await fetch(new URL("localhost-3000/image.png", server.url));
  expect(image.headers.get("content-type")).toBe("image/png");
  expect(await image.text()).toBe("image");
});

test("archives win over prebuilt files, except for the HTML entry points", async ({ server }) => {
  expect(await text(server.url, "favicon.svg")).toBe("archived favicon");
  expect(await text(server.url, "index.html")).toBe("prebuilt index.html");
});

test("generates index.json per request", async ({ server, archivesDir }) => {
  const before = await json(server.url, "index.json");
  expect(Object.keys(before.entries)).toEqual(["button--primary"]);
  expect(before.entries["button--primary"].importPath).toBe(
    "./test-results/chromatic-archives/button.stories.json",
  );

  // Stories written after the server started, e.g. by a new test run
  await writeFiles(archivesDir, {
    "link.stories.json": JSON.stringify({ title: "link", stories: [{ name: "external" }] }),
  });

  const after = await json(server.url, "index.json");
  expect(Object.keys(after.entries)).toEqual(["button--primary", "link--external"]);
});

test("responds with error when index.json can't be generated", async ({ start, archivesDir }) => {
  const errors: string[] = [];
  const server = await start({
    logger: createLogger("error", { log: vi.fn(), warn: vi.fn(), error: (m) => errors.push(m) }),
  });

  await writeFiles(archivesDir, {
    "button-2.stories.json": JSON.stringify({ title: "button", stories: [{ name: "primary" }] }),
  });

  const response = await fetch(new URL("index.json", server.url));

  expect(response.status).toBe(500);
  expect(await response.text()).toContain("Duplicate stories with id: button--primary");
  expect(errors).toEqual([expect.stringContaining("Failed to serve /index.json")]);
});

test("does not serve stories files from subdirectories", async ({ server, archivesDir }) => {
  await writeFiles(archivesDir, { "nested/link.stories.json": "{}" });

  expect((await fetch(new URL("nested/link.stories.json", server.url))).status).toBe(404);
});

test("responds 404 for missing files", async ({ server }) => {
  expect((await fetch(new URL("missing.js", server.url))).status).toBe(404);
});

// `button.stories.json` is one level above the `archive` directory, so a traversal would find it.
// Unencoded `..` segments are normalized by URL parsing, only encoded slashes reach the file system.
test.for(["/..%2fbutton.stories.json", "/%2e%2e%2fbutton.stories.json"])(
  "prevents path traversal with %s",
  async (pathname, { server }) => {
    expect(await rawStatus(server.url, pathname)).toBe(404);
  },
);

test.for(["evil.com", "evil.com:6006", "127.0.0.1.evil.com", "localhost.evil.com"])(
  "blocks DNS rebinding with Host %s",
  async (host, { server }) => {
    expect(await rawStatus(server.url, "/index.json", { Host: host })).toBe(403);
  },
);

test.for(["localhost:6006", "app.localhost", "127.0.0.1:6006", "[::1]:6006", "192.168.1.10"])(
  "allows Host %s",
  async (host, { server }) => {
    expect(await rawStatus(server.url, "/index.json", { Host: host })).toBe(200);
  },
);

test.for([
  ["my-machine.local:6006", "my-machine.local", true],
  ["MY-MACHINE.local", "my-machine.local", true],
  ["my-machine.local", "localhost", false],
  ["", "localhost", false],
  ["not a host", "localhost", false],
] as const)("isAllowedHost(%j, %j) is %s", ([hostHeader, host, expected]) => {
  expect(isAllowedHost(hostHeader, host)).toBe(expected);
});

test("sets Cross-Origin-Resource-Policy on all responses", async ({ server }) => {
  for (const pathname of ["index.json", "button.stories.json", "favicon.svg", "missing.js"]) {
    const response = await fetch(new URL(pathname, server.url));

    expect.soft(response.headers.get("cross-origin-resource-policy"), pathname).toBe("same-origin");
  }
});

test("does not log cancelled requests as errors", async ({ start, archivesDir }) => {
  await writeFiles(archivesDir, { "archive/large.bin": "x".repeat(10_000_000) });

  const errors: string[] = [];
  const server = await start({
    logger: createLogger("error", { log: vi.fn(), warn: vi.fn(), error: (m) => errors.push(m) }),
  });
  const { hostname, port } = new URL(server.url);

  // Cancel the request after receiving the first chunk
  await new Promise<void>((resolve) => {
    const request = get({ hostname, port, path: "/large.bin" }, (response) => {
      response.once("data", () => {
        request.destroy();
        setTimeout(resolve, 100);
      });
    });
    request.on("error", () => {});
  });

  expect(errors).toEqual([]);
});

test("responds to HEAD requests without body", async ({ server }) => {
  const response = await fetch(new URL("button.stories.json", server.url), { method: "HEAD" });

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("");
});

test("rejects other methods", async ({ server }) => {
  const response = await fetch(new URL("index.json", server.url), { method: "POST" });

  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
});

test("throws when archives directory is missing", async ({ start, archivesDir }) => {
  await rm(archivesDir, { recursive: true });
  const onArchivesCheck = vi.fn();

  await expect(start({}, { onArchivesCheck })).rejects.toThrow(
    "Chromatic archives directory cannot be found",
  );
  expect(onArchivesCheck).toHaveBeenCalledWith(expect.any(Error));
});

test("reports archives check", async ({ start }) => {
  const onArchivesCheck = vi.fn();

  await start({}, { onArchivesCheck });

  expect(onArchivesCheck).toHaveBeenCalledWith();
});

test("uses next free port when port is in use", async ({ start }) => {
  const port = await occupyPort();

  const server = await start({ port, strictPort: false });

  expect(Number(new URL(server.url).port)).toBeGreaterThan(port);
});

test("throws when explicit port is in use", async ({ start }) => {
  const port = await occupyPort();

  await expect(start({ port, strictPort: true })).rejects.toThrow(
    `Port ${port} is already in use. Pass another --port.`,
  );
});

test.for(["info", "warn"] as const)(
  "logs ready message with log level %s",
  async (level, { start }) => {
    const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

    const server = await start({ logger: createLogger(level, output) });

    expect(output.log.mock.calls).toEqual([
      [formatReadyMessage({ url: server.url, archivesDir: "test-results/chromatic-archives" })],
    ]);
  },
);

test("ready message", () => {
  expect(
    formatReadyMessage({
      url: "http://localhost:6006/",
      archivesDir: "test-results/chromatic-archives",
    }),
  ).toMatchInlineSnapshot(`
    "╭───────────────────────────────────────────────────╮
    │   Storybook ready!                                │
    │                                                   │
    │   - Local:      http://localhost:6006/            │
    │   - Archives:   test-results/chromatic-archives   │
    ╰───────────────────────────────────────────────────╯"
  `);
});

test("ready message with network URL", () => {
  expect(
    formatReadyMessage({
      url: "http://localhost:6006/",
      networkUrl: "http://192.168.1.160:6006/",
      archivesDir: "test-results/chromatic-archives",
    }),
  ).toMatchInlineSnapshot(`
    "╭──────────────────────────────────────────────────────────╮
    │   Storybook ready!                                       │
    │                                                          │
    │   - Local:             http://localhost:6006/            │
    │   - On your network:   http://192.168.1.160:6006/        │
    │   - Archives:          test-results/chromatic-archives   │
    ╰──────────────────────────────────────────────────────────╯"
  `);
});

async function occupyPort() {
  const blocker = createServer();
  await new Promise<void>((resolve) => blocker.listen(0, "127.0.0.1", resolve));

  onTestFinished(() => new Promise<void>((resolve) => blocker.close(() => resolve())));

  return (blocker.address() as AddressInfo).port;
}

/**
 * Sends the path as is, unlike `fetch()`, which normalizes `..` segments away.
 * Also allows setting the `Host` header, which `fetch()` doesn't.
 */
function rawStatus(url: string, pathname: string, headers?: Record<string, string>) {
  const { hostname, port } = new URL(url);

  return new Promise<number | undefined>((resolve, reject) => {
    get({ hostname, port, path: pathname, headers }, (response) => {
      response.resume();
      resolve(response.statusCode);
    }).on("error", reject);
  });
}

async function text(url: string, pathname: string) {
  const response = await fetch(new URL(pathname, url));
  expect(response.status, `GET /${pathname}`).toBe(200);

  return response.text();
}

async function json(url: string, pathname: string) {
  return JSON.parse(await text(url, pathname));
}

async function writeFiles(directory: string, files: Record<string, string>) {
  for (const [filename, content] of Object.entries(files)) {
    await mkdir(dirname(join(directory, filename)), { recursive: true });
    await writeFile(join(directory, filename), content);
  }
}
