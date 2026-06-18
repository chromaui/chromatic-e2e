import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, assert, expect, onTestFinished, test } from 'vitest';
import { uniqueId } from '@chromatic-com/shared-e2e/write-archive/stories-files';
import type { Module } from './webpack-stats-reporter';
import { DEFAULT_OUTPUT_DIR } from '../constants';
import { runFixture as baseRunFixture, StableTestFileOrderSorter } from '../../test/utils/node';

afterEach(() => {
  uniqueId.value = 1;
});

test('TurboSnap enabled, source files', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  await runFixture({ root }, { turboSnap: true });

  const stats = readStats(root);
  const modules = stats.modules.filter(excludeNodeModules).filter(excludePluginSources);

  expect(modules).toMatchInlineSnapshot(`
    [
      {
        "id": "turbo-snap-1.test.ts",
        "name": "turbo-snap-1.test.ts",
        "reasons": [
          {
            "moduleName": ".vitest/chromatic/chromatic-archives/turbo-snap-1-1.stories.json",
          },
        ],
      },
      {
        "id": "components/button/button.ts",
        "name": "components/button/button.ts",
        "reasons": [
          {
            "moduleName": "components/button/index.ts",
          },
        ],
      },
      {
        "id": "components/button/index.ts",
        "name": "components/button/index.ts",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
          {
            "moduleName": "turbo-snap-2.test.ts",
          },
        ],
      },
      {
        "id": "components/accordion/accordion.ts",
        "name": "components/accordion/accordion.ts",
        "reasons": [
          {
            "moduleName": "components/accordion/index.ts",
          },
        ],
      },
      {
        "id": "components/accordion/index.ts",
        "name": "components/accordion/index.ts",
        "reasons": [
          {
            "moduleName": "turbo-snap-1.test.ts",
          },
        ],
      },
      {
        "id": "turbo-snap-2.test.ts",
        "name": "turbo-snap-2.test.ts",
        "reasons": [
          {
            "moduleName": ".vitest/chromatic/chromatic-archives/turbo-snap-2-2.stories.json",
          },
        ],
      },
    ]
  `);
});

test('TurboSnap enabled, dependency files', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  await runFixture({ root }, { turboSnap: true });

  const stats = readStats(root);

  expect
    .soft(
      stats.modules.find((mod) => mod.id.includes('node_modules/vitest')),
      'Stats should contain Vitest dependency'
    )
    .toBeDefined();

  // Optimized dependencies must be remapped to their sources, never reported as cache files
  expect(stats.modules.filter((mod) => mod.id.includes('.vite'))).toEqual([]);

  // extend-to-be-announced has a single dependency aria-live-capture, which is 0 deps.
  // This should be stable enough for snapshot testing. Exclude all other deps as they might change frequently.
  const modules = stats.modules.filter(
    (mod) => mod.id.includes('extend-to-be-announced') || mod.id.includes('aria-live-capture')
  );

  for (const mod of modules) {
    const exists = existsSync(resolve(root, mod.id));
    expect.soft(exists, `Expected file ${mod.id} to exist`).toBe(true);
  }

  expect(modules).toMatchInlineSnapshot(`
    [
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/dom-node-safe-guards.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/dom-node-safe-guards.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/config.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/config.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/queries.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/queries.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/utils.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/utils.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/interceptors.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/interceptors.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/capture-announcements.js",
        "name": "../../../../node_modules/.pnpm/aria-live-capture@2.0.0/node_modules/aria-live-capture/dist/capture-announcements.js",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/to-be-announced.mjs",
        "name": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/to-be-announced.mjs",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/vitest/register.mjs",
        "name": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/vitest/register.mjs",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
      {
        "id": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/vitest/index.mjs",
        "name": "../../../../node_modules/.pnpm/extend-to-be-announced@2.0.0/node_modules/extend-to-be-announced/dist/vitest/index.mjs",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
        ],
      },
    ]
  `);
});

test('TurboSnap enabled, circular imports', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');

  await runFixture(
    {
      root,
      /** {@link file://./../../test/fixtures/turbo-snap-cycle.test.ts} */
      include: [resolve(root, 'turbo-snap-cycle.test.ts')],
    },
    { turboSnap: true }
  );

  const stats = readStats(root);
  const modules = stats.modules.filter(excludeNodeModules).filter(excludePluginSources);

  expect(modules).toMatchInlineSnapshot(`
    [
      {
        "id": "turbo-snap-cycle.test.ts",
        "name": "turbo-snap-cycle.test.ts",
        "reasons": [
          {
            "moduleName": ".vitest/chromatic/chromatic-archives/turbo-snap-cycle-1.stories.json",
          },
        ],
      },
      {
        "id": "components/cycle/cycle-a.ts",
        "name": "components/cycle/cycle-a.ts",
        "reasons": [
          {
            "moduleName": "components/cycle/cycle-b.ts",
          },
          {
            "moduleName": "components/cycle/index.ts",
          },
        ],
      },
      {
        "id": "components/cycle/cycle-b.ts",
        "name": "components/cycle/cycle-b.ts",
        "reasons": [
          {
            "moduleName": "components/cycle/cycle-a.ts",
          },
        ],
      },
      {
        "id": "components/cycle/index.ts",
        "name": "components/cycle/index.ts",
        "reasons": [
          {
            "moduleName": "turbo-snap-cycle.test.ts",
          },
        ],
      },
    ]
  `);
});

test('TurboSnap enabled, CSS imports', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');

  await runFixture(
    {
      root,
      /** {@link file://./../../test/fixtures/turbo-snap-css.test.ts} */
      include: [resolve(root, 'turbo-snap-css.test.ts')],
    },
    { turboSnap: true }
  );

  const stats = readStats(root);

  // `base.css` is imported via CSS `@import`, so it only exists in the module
  // graph as a file-only entry without an id, similar to Sass partials
  const modules = stats.modules.filter((mod) => mod.id.includes('components/styled'));

  expect(modules).toMatchInlineSnapshot(`
    [
      {
        "id": "components/styled/base.css",
        "name": "components/styled/base.css",
        "reasons": [
          {
            "moduleName": "components/styled/styles.css",
          },
        ],
      },
      {
        "id": "components/styled/styles.css",
        "name": "components/styled/styles.css",
        "reasons": [
          {
            "moduleName": "components/styled/styled.ts",
          },
        ],
      },
      {
        "id": "components/styled/styled.ts",
        "name": "components/styled/styled.ts",
        "reasons": [
          {
            "moduleName": "components/styled/index.ts",
          },
        ],
      },
      {
        "id": "components/styled/index.ts",
        "name": "components/styled/index.ts",
        "reasons": [
          {
            "moduleName": "turbo-snap-css.test.ts",
          },
        ],
      },
    ]
  `);
});

test('TurboSnap enabled with custom output directory', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  const outputDirectory = '.vitest/custom-output-directory';

  onTestFinished(() => {
    const reports = resolve(root, outputDirectory);

    if (existsSync(reports)) {
      rmSync(reports, { recursive: true, force: true });
    }
  });

  await runFixture({ root }, { turboSnap: true, outputDirectory });

  const stats = readStats(root, outputDirectory);
  const modules = stats.modules.filter(excludeNodeModules).filter(excludePluginSources);

  expect(modules).toMatchInlineSnapshot(`
    [
      {
        "id": "turbo-snap-1.test.ts",
        "name": "turbo-snap-1.test.ts",
        "reasons": [
          {
            "moduleName": ".vitest/custom-output-directory/chromatic-archives/turbo-snap-1-1.stories.json",
          },
        ],
      },
      {
        "id": "components/button/button.ts",
        "name": "components/button/button.ts",
        "reasons": [
          {
            "moduleName": "components/button/index.ts",
          },
        ],
      },
      {
        "id": "components/button/index.ts",
        "name": "components/button/index.ts",
        "reasons": [
          {
            "moduleName": "components/accordion/accordion.ts",
          },
          {
            "moduleName": "turbo-snap-2.test.ts",
          },
        ],
      },
      {
        "id": "components/accordion/accordion.ts",
        "name": "components/accordion/accordion.ts",
        "reasons": [
          {
            "moduleName": "components/accordion/index.ts",
          },
        ],
      },
      {
        "id": "components/accordion/index.ts",
        "name": "components/accordion/index.ts",
        "reasons": [
          {
            "moduleName": "turbo-snap-1.test.ts",
          },
        ],
      },
      {
        "id": "turbo-snap-2.test.ts",
        "name": "turbo-snap-2.test.ts",
        "reasons": [
          {
            "moduleName": ".vitest/custom-output-directory/chromatic-archives/turbo-snap-2-2.stories.json",
          },
        ],
      },
    ]
  `);
});

test('TurboSnap enabled with Vitest configuration file', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  const configFile = 'configs/vitest.config.custom.ts';

  await runFixture({ root, config: resolve(root, configFile) }, { turboSnap: true });

  const stats = readStats(root) as { modules: Module[] };
  assert(stats.modules?.length, 'Modules missing from stats');

  const configEntries = stats.modules.filter((m) => m.id === configFile);
  expect(configEntries.length).toBe(1);

  expect(configEntries[0]).toMatchInlineSnapshot(`
    {
      "id": "configs/vitest.config.custom.ts",
      "name": "configs/vitest.config.custom.ts",
      "reasons": [
        {
          "moduleName": "turbo-snap-1.test.ts",
        },
        {
          "moduleName": "turbo-snap-2.test.ts",
        },
      ],
    }
  `);
});

test('TurboSnap disabled', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  await runFixture({ root }, { turboSnap: false });

  const stats = readStats(root);
  expect(stats).toContain('ENOENT: no such file or directory');
  expect(stats).toContain('.vitest/chromatic/preview-stats.json');
});

function readStats(root = process.cwd(), outputDir = DEFAULT_OUTPUT_DIR): { modules: Module[] } {
  const statsPath = resolve(root, outputDir, 'preview-stats.json');

  try {
    return JSON.parse(readFileSync(statsPath, 'utf-8'));
  } catch (error) {
    return error.message;
  }
}

function runFixture(
  options?: Parameters<typeof baseRunFixture>[0],
  pluginOptions?: Parameters<typeof baseRunFixture>[1]
) {
  return baseRunFixture(
    {
      fileParallelism: false,
      sequence: { sequencer: StableTestFileOrderSorter },
      include: [
        /** {@link file://./../../test/fixtures/turbo-snap-1.test.ts} */
        resolve(import.meta.dirname, '../../test/fixtures/turbo-snap-1.test.ts'),
        /** {@link file://./../../test/fixtures/turbo-snap-2.test.ts} */
        resolve(import.meta.dirname, '../../test/fixtures/turbo-snap-2.test.ts'),
      ],
      ...options,
    },
    pluginOptions
  );
}

function excludeNodeModules(mod: Module) {
  return !mod.id.includes('node_modules');
}

// Exclude plugin source files from the stats report, as they are not relevant to the test results.
function excludePluginSources(mod: Module) {
  return !mod.id.includes('src/browser/') && !mod.id.includes('src/index.ts');
}
