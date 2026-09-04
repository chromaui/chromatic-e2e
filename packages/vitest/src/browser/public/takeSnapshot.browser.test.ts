import { beforeEach, describe, expect, inject, test, vi } from "vitest";
import { commands, page } from "vitest/browser";

import { configure } from "./configure";
import { takeSnapshot } from "./takeSnapshot";

beforeEach(() => {
  document.body.innerHTML = "";
});

test("saves snapshot on server", async ({ task }) => {
  const h1 = document.createElement("h1");
  h1.textContent = "Example heading";
  document.body.appendChild(h1);

  await takeSnapshot("example");

  const snapshots = await commands.__chromatic_getSnapshots(task.id);
  expect(snapshots).toHaveProperty("example");

  expect(snapshots.example.snapshot).toMatchInlineSnapshot(`
    {
      "attributes": {},
      "childNodes": [
        {
          "id": "number",
          "textContent": "Example heading",
          "type": 3,
        },
      ],
      "id": "number",
      "tagName": "h1",
      "type": 2,
    }
  `);
});

test("saves pseudo class ids on server", async ({ task }) => {
  const hovered = document.createElement("button");
  hovered.textContent = "Hover here";
  document.body.appendChild(hovered);

  const focused = document.createElement("button");
  focused.textContent = "Focus here";
  document.body.appendChild(focused);

  await page.getByRole("button", { name: "Focus here" }).click();
  await page.getByRole("button", { name: "Hover here" }).hover();

  await takeSnapshot("example");

  const snapshots = await commands.__chromatic_getSnapshots(task.id);
  expect(snapshots).toHaveProperty("example");

  expect(snapshots.example.pseudoClassIds).toMatchInlineSnapshot(`
    {
      ":active": [],
      ":focus": [
        118,
      ],
      ":focus-visible": [],
      ":hover": [
        81,
        115,
        116,
      ],
    }
  `);
});

test("saves multiple snapshots", async ({ task }) => {
  await takeSnapshot("example-1");
  await takeSnapshot("example-2");

  const snapshots = await commands.__chromatic_getSnapshots(task.id);

  expect(snapshots).toHaveProperty("example-1");
  expect(snapshots).toHaveProperty("example-2");
});

test("implicit snapshot names increment", async ({ task }) => {
  await takeSnapshot();

  {
    const snapshots = await commands.__chromatic_getSnapshots(task.id);

    expect(snapshots).toHaveProperty("Snapshot #1");
    expect(Object.keys(snapshots)).toHaveLength(1);
  }

  await takeSnapshot();

  {
    const snapshots = await commands.__chromatic_getSnapshots(task.id);

    expect.soft(snapshots).toHaveProperty("Snapshot #1");
    expect.soft(snapshots).toHaveProperty("Snapshot #2");
    expect.soft(Object.keys(snapshots)).toHaveLength(2);
  }
});

test("blob URLs are replaced with data URLs", async ({ task }) => {
  const blob = await fetch(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAQAAADIvofAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfhBhAPKSstM+EuAAAAvUlEQVQY05WQIW4CYRgF599gEZgeoAKBWIfCNSmVvQMe3wv0ChhIViKwtTQEAYJwhgpISBA0JSxNIdlB7LIGTJ/8kpeZ7wW5TcT9o/QNBtvOrrWMrtg0sSGOFeELbHlCDsQ+ukeYiHNFJPHBDRKlQKVEbFkLUT3AiAxI6VGCXsWXAoQLBUl5E7HjUFwiyI4zf/wWoB3CFnxX5IeGdY8IGU/iwE9jcZrLy4pnEat+FL4hf/cbqREKo/Cf6W5zASVMeh234UtGAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTA2LTE2VDE1OjQxOjQzLTA3OjAwd1xNIQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wNi0xNlQxNTo0MTo0My0wNzowMAYB9Z0AAAAASUVORK5CYII=",
  ).then((res) => res.blob());

  const img = document.createElement("img");
  const loaded = new Promise((resolve) => (img.onload = resolve));
  img.src = window.URL.createObjectURL(blob);
  document.body.appendChild(img);

  await loaded;
  await takeSnapshot("example");

  const snapshots = await commands.__chromatic_getSnapshots(task.id);
  expect(snapshots).toHaveProperty("example");

  const { snapshot } = snapshots.example;
  expect(snapshot).toMatchInlineSnapshot(`
    {
      "attributes": {
        "src": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAQAAADIvofAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfhBhAPKSstM+EuAAAAvUlEQVQY05WQIW4CYRgF599gEZgeoAKBWIfCNSmVvQMe3wv0ChhIViKwtTQEAYJwhgpISBA0JSxNIdlB7LIGTJ/8kpeZ7wW5TcT9o/QNBtvOrrWMrtg0sSGOFeELbHlCDsQ+ukeYiHNFJPHBDRKlQKVEbFkLUT3AiAxI6VGCXsWXAoQLBUl5E7HjUFwiyI4zf/wWoB3CFnxX5IeGdY8IGU/iwE9jcZrLy4pnEat+FL4hf/cbqREKo/Cf6W5zASVMeh234UtGAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTA2LTE2VDE1OjQxOjQzLTA3OjAwd1xNIQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wNi0xNlQxNTo0MTo0My0wNzowMAYB9Z0AAAAASUVORK5CYII=",
      },
      "childNodes": [],
      "id": "number",
      "rootId": 383,
      "tagName": "img",
      "type": 2,
    }
  `);

  expect(img.src).toMatch(/^blob:/);
});

describe("snapshot failure tracking", () => {
  configure({ disableAutoSnapshot: true });

  beforeEach(() => {
    const options = inject("__chromatic_options");
    options.telemetry.enabled = true;

    const telemetry = vi.spyOn(commands, "__chromatic_telemetry").mockResolvedValue(undefined);

    return () => {
      options.telemetry.enabled = false;
      telemetry.mockRestore();
    };
  });

  test("DOM snapshot capture fails", async () => {
    document.body.innerHTML = "<canvas></canvas>";

    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockThrowOnce(
      new Error("Simulated capture failure"),
    );

    await expect(takeSnapshot("example")).rejects.toThrow("Simulated capture failure");

    expect(commands.__chromatic_telemetry).toHaveBeenCalledWith({
      eventType: "snapshot_error",
      level: "error",
      payload: {
        operation: "capture",
        isAutomaticSnapshot: false,
        error: expect.stringContaining("Simulated capture failure"),
      },
    });
  });

  test("tracks snapshot_error when blob URL replacement fails", async () => {
    const revokedURL = URL.createObjectURL(new Blob([""], { type: "image/png" }));
    URL.revokeObjectURL(revokedURL);

    document.body.innerHTML = `<img src="${revokedURL}" />`;

    await expect(takeSnapshot("example")).rejects.toThrow("Failed to fetch");

    expect(commands.__chromatic_telemetry).toHaveBeenCalledWith({
      eventType: "snapshot_error",
      level: "error",
      payload: {
        operation: "replace-blob-urls",
        isAutomaticSnapshot: false,
        error: expect.stringContaining("Failed to fetch"),
      },
    });
  });

  test("tracks snapshot_error when DOM snapshot upload fails", async () => {
    vi.spyOn(commands, "__chromatic_uploadDOMSnapshot").mockRejectedValueOnce(
      new Error("Simulated upload failure"),
    );

    await expect(takeSnapshot("example")).rejects.toThrow("Simulated upload failure");

    expect(commands.__chromatic_telemetry).toHaveBeenCalledWith({
      eventType: "snapshot_error",
      level: "error",
      payload: {
        operation: "upload",
        isAutomaticSnapshot: false,
        error: expect.stringContaining("Simulated upload failure"),
      },
    });
  });
});
