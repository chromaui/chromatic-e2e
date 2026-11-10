import { existsSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright";
import { expect, test as base, vi } from "vitest";

import { startServer } from "./server";

// Spawning a real browser for smoke tests against the prebuilt Storybook
vi.setConfig({ testTimeout: 20_000, hookTimeout: 20_000 });

const PREBUILT = path.resolve(import.meta.dirname, "../dist/storybook-static");
const FIXTURES = path.resolve(import.meta.dirname, "../fixtures");

const test = base
  .extend("server", { scope: "file", auto: true }, async ({}, { onCleanup }) => {
    if (!existsSync(path.join(PREBUILT, "iframe.html"))) {
      throw new Error(`Prebuilt Storybook not found at ${PREBUILT}. Run "pnpm build" first.`);
    }

    const server = await startServer([FIXTURES, PREBUILT]);
    onCleanup(async () => server.close());

    return server;
  })
  .extend("browser", { scope: "file" }, async ({}, { onCleanup }) => {
    const browser = await chromium.launch();
    onCleanup(async () => browser.close());

    return browser;
  })
  .extend("page", async ({ browser }, { onCleanup }) => {
    const errors: string[] = [];
    const page = await browser.newPage();
    page.on("pageerror", (error) => errors.push(error.message));

    onCleanup(async () => {
      await page.close();
      expect(errors).toEqual([]);
    });

    return page;
  })
  .extend("openStory", async ({ page, server }) => {
    return async function openStory(id: string) {
      await page.goto(`${server.url}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`);
    };
  });

test("renders story with an image asset", async ({ openStory, page }) => {
  await openStory("archiving-assets-asset-is-found-at-relative-path--snapshot-1");

  const image = page.locator('img[src="/asset-paths/relative/purple.png"]');
  await image.waitFor();

  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(200);
});

test("renders story with non-ASCII name", async ({ openStory, page }) => {
  await openStory("snapshot-names-in-test-case-name-あ--snapshot-1");

  await page.getByText("Testing testing just a basic page").waitFor();
});

test.for([
  ["480-x-320", "480", "320"],
  ["850-x-500", "850", "500"],
  ["1050-x-1080", "1050", "1080"],
])(
  "renders snapshot of story's viewport %s",
  async ([name, width, height], { openStory, page }) => {
    await openStory(
      `viewports-hardcoded-viewport-snapshots-capture-multiple-viewports-inside-a-single-test-case--${name}`,
    );

    await page.getByText("I'm always rendered").waitFor();

    expect(await page.locator("#width").textContent()).toBe(width);
    expect(await page.locator("#height").textContent()).toBe(height);
  },
);

test("applies pseudo-state classes", async ({ openStory, page }) => {
  await openStory("css-pseudo-states-captures-hover-state--hover");

  const target = page.locator("button#target");
  await target.waitFor();

  expect(await target.getAttribute("class")).toBe(":hover");
});

test("renders iframe contents", async ({ openStory, page }) => {
  await openStory("embeds-same-origin-embed-page-loads--snapshot-1");

  const frame = page.frameLocator("iframe");
  await frame.getByText("Embedded page").waitFor();

  const images = frame.locator("img");
  await expect.poll(() => images.count()).toBe(3);
  await expect
    .poll(() => images.evaluateAll((imgs: HTMLImageElement[]) => imgs.every((i) => i.naturalWidth)))
    .toBe(true);
});

test("manager lists stories from index.json", async ({ server, page }) => {
  await page.goto(`${server.url}/index.html`);

  const sidebar = page.locator("#storybook-explorer-tree");
  await sidebar.getByText("viewports").waitFor();

  for (const group of [
    "archiving-assets",
    "css-pseudo-states",
    "embeds",
    "snapshot-names",
    "viewports",
  ]) {
    await sidebar.getByText(group, { exact: true }).waitFor();
  }
});
