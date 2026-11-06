import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { expect, test as base, vi } from "vitest";

import { buildArchiveStorybook } from "./build";
import { createLogger } from "./cli";

const DEFAULT_OUTPUT_DIR = "test-results";

type BuildOptions = Parameters<typeof buildArchiveStorybook>[0];
type BuildCallbacks = Parameters<typeof buildArchiveStorybook>[1];

const test = base
  .extend("projectRoot", async ({}, { onCleanup }) => {
    const projectRoot = await mkdtemp(join(tmpdir(), "build-archive-storybook-"));
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(projectRoot);

    onCleanup(async () => {
      cwd.mockRestore();
      vi.unstubAllEnvs();
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
  .extend("build", async ({ storybookDir }) => {
    return function build(overrides: Partial<BuildOptions> = {}, callbacks?: BuildCallbacks) {
      return buildArchiveStorybook(
        {
          storybookDir,
          defaultOutputDir: DEFAULT_OUTPUT_DIR,
          outputDir: "storybook-static",
          logger: createLogger("silent"),
          ...overrides,
        },
        callbacks,
      );
    };
  });

test("copies prebuilt Storybook and archives", async ({ build, projectRoot }) => {
  await build();

  const outputDir = join(projectRoot, "storybook-static");

  expect(await listFiles(outputDir)).toMatchInlineSnapshot(`
    [
      "button-primary.w1280h720.snapshot.json",
      "button.stories.json",
      "favicon.svg",
      "iframe.html",
      "index.html",
      "index.json",
      "localhost-3000/image.png",
      "sb-manager/runtime.js",
    ]
  `);

  // Archives win on collision, except for the HTML entry points
  expect(await read(outputDir, "favicon.svg")).toBe("archived favicon");
  expect(await read(outputDir, "index.html")).toBe("prebuilt index.html");
  expect(await read(outputDir, "button-primary.w1280h720.snapshot.json")).toBe("snapshot");
});

test("generates index.json from stories files", async ({ build, projectRoot }) => {
  await build();

  const index = JSON.parse(await read(projectRoot, "storybook-static/index.json"));

  expect(index.entries["button--primary"]).toMatchObject({
    id: "button--primary",
    importPath: "./test-results/chromatic-archives/button.stories.json",
  });
});

test("cleans output directory of previous builds", async ({ build, projectRoot }) => {
  await writeFiles(join(projectRoot, "storybook-static"), { "previous.stories.json": "{}" });

  await build();

  expect(existsSync(join(projectRoot, "storybook-static/previous.stories.json"))).toBe(false);
});

test("uses CHROMATIC_ARCHIVE_LOCATION", async ({ build, projectRoot }) => {
  vi.stubEnv("CHROMATIC_ARCHIVE_LOCATION", "custom");
  await writeFiles(join(projectRoot, "custom/chromatic-archives"), {
    "custom.stories.json": JSON.stringify({ title: "custom", stories: [{ name: "story" }] }),
  });

  await build();

  const index = JSON.parse(await read(projectRoot, "storybook-static/index.json"));
  expect(Object.keys(index.entries)).toEqual(["custom--story"]);
});

test("copies preview-stats.json into stats directory", async ({ build, projectRoot }) => {
  await writeFiles(join(projectRoot, DEFAULT_OUTPUT_DIR), { "preview-stats.json": "stats" });

  await build({ statsDir: "stats" });

  expect(await read(projectRoot, "stats/preview-stats.json")).toBe("stats");
});

test("writes empty preview-stats.json when there is none", async ({ build, projectRoot }) => {
  await build({ statsDir: "storybook-static" });

  expect(await read(projectRoot, "storybook-static/preview-stats.json")).toBe('{"modules":[]}');
});

test("does not write preview-stats.json without stats directory", async ({
  build,
  projectRoot,
}) => {
  await writeFiles(join(projectRoot, DEFAULT_OUTPUT_DIR), { "preview-stats.json": "stats" });

  await build();

  expect(existsSync(join(projectRoot, "storybook-static/preview-stats.json"))).toBe(false);
});

test("throws when archives directory is missing", async ({ build, archivesDir }) => {
  await rm(archivesDir, { recursive: true });
  const onArchivesCheck = vi.fn();

  await expect(build({}, { onArchivesCheck })).rejects.toThrow(
    "Chromatic archives directory cannot be found",
  );
  expect(onArchivesCheck).toHaveBeenCalledWith(expect.any(Error));
});

test("reports archives check", async ({ build }) => {
  const onArchivesCheck = vi.fn();

  await build({}, { onArchivesCheck });

  expect(onArchivesCheck).toHaveBeenCalledWith();
});

test.for([".", ".."])(
  "refuses to remove project directory with --output-dir %s",
  async (dir, { build }) => {
    await expect(build({ outputDir: dir })).rejects.toThrow("Won't remove project directory");
  },
);

test.for([DEFAULT_OUTPUT_DIR, `${DEFAULT_OUTPUT_DIR}/chromatic-archives`])(
  "refuses to remove archives with --output-dir %s",
  async (dir, { build, archivesDir }) => {
    await expect(build({ outputDir: dir })).rejects.toThrow("it contains the archives");
    expect(existsSync(archivesDir)).toBe(true);
  },
);

test("logs output", async ({ build, projectRoot }) => {
  const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

  await build({ logger: createLogger("info", output) });

  expect(output.log.mock.calls.map(([message]) => message.replace(projectRoot, "<root>")))
    .toMatchInlineSnapshot(`
      [
        "Building Storybook from test-results/chromatic-archives",
        "Generated index.json with 1 stories",
        "Output directory: <root>/storybook-static",
      ]
    `);
});

test("logs output directory with --quiet", async ({ build, projectRoot }) => {
  const output = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };

  await build({ logger: createLogger("warn", output) });

  expect(output.log.mock.calls).toEqual([[`Output directory: ${projectRoot}/storybook-static`]]);
});

async function writeFiles(directory: string, files: Record<string, string>) {
  for (const [filename, content] of Object.entries(files)) {
    await mkdir(dirname(join(directory, filename)), { recursive: true });
    await writeFile(join(directory, filename), content);
  }
}

async function listFiles(directory: string) {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1))
    .sort();
}

function read(directory: string, filename: string) {
  return readFile(join(directory, filename), "utf-8");
}
