import * as path from 'path';
import { test, expect } from '../src';

test('Upload a Single file and Assert blob', async ({ page }) => {
  await page.goto('/createObjectUrl');
  const fileWithPath = path.join(__dirname, '../../../test-server/fixtures/blue.png');
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#fileInput').click(),
  ]);
  await fileChooser.setFiles([fileWithPath]);
  await page.locator('#fileInput').dispatchEvent('change');
  await expect(page.locator('#objectUrl')).toHaveText(/blob:.*/);
});

// adapted from https://fossies.org/linux/playwright/tests/library/trace-viewer.spec.ts
test('Fetch data for blob', async ({ page }) => {
  await page.goto('/createObjectUrl');
  await page.evaluate(async () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAQAAADIvofAAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfhBhAPKSstM+EuAAAAvUlEQVQY05WQIW4CYRgF599gEZgeoAKBWIfCNSmVvQMe3wv0ChhIViKwtTQEAYJwhgpISBA0JSxNIdlB7LIGTJ/8kpeZ7wW5TcT9o/QNBtvOrrWMrtg0sSGOFeELbHlCDsQ+ukeYiHNFJPHBDRKlQKVEbFkLUT3AiAxI6VGCXsWXAoQLBUl5E7HjUFwiyI4zf/wWoB3CFnxX5IeGdY8IGU/iwE9jcZrLy4pnEat+FL4hf/cbqREKo/Cf6W5zASVMeh234UtGAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE3LTA2LTE2VDE1OjQxOjQzLTA3OjAwd1xNIQAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxNy0wNi0xNlQxNTo0MTo0My0wNzowMAYB9Z0AAAAASUVORK5CYII=';
    const blob = await fetch(dataUrl).then((res) => res.blob());
    const url = window.URL.createObjectURL(blob);
    const img = document.createElement('img');
    img.id = 'blobImg';
    img.src = url;
    const loaded = new Promise((f) => (img.onload = f));
    document.body.appendChild(img);
    await loaded;
  });
  const size = await page.locator('#blobImg').evaluate((e) => (e as HTMLImageElement).naturalWidth);
  expect(size).toBe(10);
});
