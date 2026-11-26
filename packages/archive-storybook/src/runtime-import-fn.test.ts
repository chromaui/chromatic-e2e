import { afterAll, expect, test, vi } from "vitest";

import { importModule, toCsfModule } from "./runtime-import-fn";

// The module captures `document.baseURI` when it's loaded, so stub it before the import above
vi.hoisted(() => {
  vi.stubGlobal("document", { baseURI: "http://localhost:6006/iframe.html?id=some-story" });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const storiesFile = {
  title: "home page",
  stories: [
    {
      name: "renders heading",
      globals: { viewport: "w1280h720" },
      parameters: {
        __id: "home-page--renders-heading",
        server: { id: "home-page-renders-heading" },
        viewport: { defaultViewport: "w1280h720" },
      },
    },
    {
      name: "あ story",
      globals: { viewport: "w800h600" },
      parameters: {
        __id: "home-page--あ-story",
        server: { id: "home-page-あ-story" },
        viewport: { defaultViewport: "w800h600" },
      },
    },
  ],
};

test("converts stories file into CSF module exports keyed by story name", () => {
  expect(toCsfModule(storiesFile)).toEqual({
    default: { title: "home page" },
    "renders heading": storiesFile.stories[0],
    "あ story": storiesFile.stories[1],
  });
});

test("keeps meta-level fields in default export", () => {
  const module = toCsfModule({ ...storiesFile, tags: ["e2e"], parameters: { layout: "padded" } });

  expect(module.default).toEqual({
    title: "home page",
    tags: ["e2e"],
    parameters: { layout: "padded" },
  });
});

test("prefixes story names that collide with reserved exports", () => {
  const story = { name: "default", parameters: { __id: "home-page--default" } };
  const module = toCsfModule({ title: "home page", stories: [story] });

  expect(module.default).toEqual({ title: "home page" });
  expect(module._default).toBe(story);
});

test("fetches stories file relative to iframe.html", async () => {
  const fetch = vi.fn(async () => Response.json(storiesFile));
  vi.stubGlobal("fetch", fetch);

  const module = await importModule(
    "./test-results/chromatic-archives/home-page.stories.json",
    vi.fn(),
  );

  expect(fetch).toHaveBeenCalledOnce();
  expect(fetch.mock.calls[0]).toEqual([new URL("http://localhost:6006/home-page.stories.json")]);
  expect(module).toEqual(toCsfModule(storiesFile));
});

test("fetches stories file with filename-only path", async () => {
  const fetch = vi.fn(async () => Response.json(storiesFile));
  vi.stubGlobal("fetch", fetch);

  await importModule("./filename-only.stories.json", vi.fn());

  expect(fetch.mock.calls[0]).toEqual([
    new URL("http://localhost:6006/filename-only.stories.json"),
  ]);
});

test("caches loaded modules", async () => {
  const fetch = vi.fn(async () => Response.json(storiesFile));
  vi.stubGlobal("fetch", fetch);

  const first = await importModule("./cached.stories.json", vi.fn());
  const second = await importModule("./cached.stories.json", vi.fn());

  expect(fetch).toHaveBeenCalledOnce();
  expect(second).toBe(first);
});

test("throws on failed request and retries on next call", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, { status: 404, statusText: "Not Found" }))
    .mockResolvedValueOnce(Response.json(storiesFile));
  vi.stubGlobal("fetch", fetch);

  await expect(importModule("./missing.stories.json", vi.fn())).rejects.toThrow(
    'Failed to load stories file "./missing.stories.json": 404 Not Found',
  );

  await expect(importModule("./missing.stories.json", vi.fn())).resolves.toEqual(
    toCsfModule(storiesFile),
  );
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("fetches non-story-json files with original importer", async () => {
  const importFn = vi.fn();

  await importModule("./filename.js", importFn);

  expect(importFn).toHaveBeenCalledOnce();
  expect(importFn.mock.calls[0]).toEqual(["./filename.js"]);
});
