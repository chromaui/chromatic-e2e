import { resolve } from 'node:path';
import * as fs from 'node:fs/promises';
import { test, expect, vi } from 'vitest';
import { addViewportsToStoriesFiles } from './set-viewports';

const writeFile = vi.mocked(fs.writeFile);

vi.mock(import('node:fs/promises'), async (importOriginal) => ({
  ...(await importOriginal()),
  writeFile: vi.fn(async () => {}),
}));

test('sets viewports to each story', async () => {
  /** See {@link file://./../../tests/fixtures/set-viewports} */
  const directory = resolve(import.meta.dirname, '../../tests/fixtures/set-viewports');
  vi.stubEnv('CHROMATIC_ARCHIVE_LOCATION', directory);

  await addViewportsToStoriesFiles();

  expect(writeFile).toHaveBeenCalledTimes(2);

  const calls = writeFile.mock.calls
    .sort((a, b) => (a[0] as string).localeCompare(b[0] as string))
    .map((call) => {
      const json = JSON.parse(call[1] as string);

      return {
        filename: (call[0] as string).replace(directory, ''),
        storyCount: json.stories.length,
        modes: json.stories[0].parameters.chromatic.modes,
        viewport: json.stories[0].parameters.viewport,
      };
    });

  expect(calls).toMatchInlineSnapshot(`
    [
      {
        "filename": "/chromatic-archives/example-1.stories.json",
        "modes": {
          "w111h222": {
            "viewport": "w111h222",
          },
          "w333h444": {
            "viewport": "w333h444",
          },
          "w555h666": {
            "viewport": "w555h666",
          },
        },
        "storyCount": 1,
        "viewport": {
          "defaultViewport": "w555h666",
          "options": {
            "w111h222": {
              "name": "w111h222",
              "styles": {
                "height": "222px",
                "width": "111px",
              },
              "type": "mobile",
            },
            "w333h444": {
              "name": "w333h444",
              "styles": {
                "height": "444px",
                "width": "333px",
              },
              "type": "mobile",
            },
            "w555h666": {
              "name": "w555h666",
              "styles": {
                "height": "666px",
                "width": "555px",
              },
              "type": "mobile",
            },
          },
        },
      },
      {
        "filename": "/chromatic-archives/example-2.stories.json",
        "modes": {
          "w777h888": {
            "viewport": "w777h888",
          },
          "w999h111": {
            "viewport": "w999h111",
          },
        },
        "storyCount": 1,
        "viewport": {
          "defaultViewport": "w999h111",
          "options": {
            "w777h888": {
              "name": "w777h888",
              "styles": {
                "height": "888px",
                "width": "777px",
              },
              "type": "tablet",
            },
            "w999h111": {
              "name": "w999h111",
              "styles": {
                "height": "111px",
                "width": "999px",
              },
              "type": "tablet",
            },
          },
        },
      },
    ]
  `);
});
