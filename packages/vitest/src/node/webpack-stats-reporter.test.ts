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

test('TurboSnap enabled', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  await runFixture({ root }, { turboSnap: true });

  expect(readStats(root)).toMatchInlineSnapshot(`
    {
      "modules": [
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
      ],
    }
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

  expect(readStats(root, outputDirectory)).toMatchInlineSnapshot(`
    {
      "modules": [
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
      ],
    }
  `);
});

test('TurboSnap enabled with Vitest configuration file', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  const configFile = 'configs/vitest.config.custom.ts';

  await runFixture({ root, config: resolve(root, configFile) }, { turboSnap: true });

  const stats = readStats(root) as { modules: Module[] };
  assert(stats.modules?.length, 'Modules missing from stats');

  for (const mod of stats.modules) {
    const shouldDependOnConfigFile = mod.id.endsWith('.test.ts');
    const dependsOnConfigFile = mod.reasons.some((r) => r.moduleName === configFile);
    const errorMessage = `Module ${mod.id} should ${shouldDependOnConfigFile ? '' : 'not '}depend on config file`;

    expect(dependsOnConfigFile, errorMessage).toBe(shouldDependOnConfigFile);
  }
});

test('TurboSnap disabled', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  await runFixture({ root }, { turboSnap: false });

  const stats = readStats(root);
  expect(stats).toContain('ENOENT: no such file or directory');
  expect(stats).toContain('.vitest/chromatic/preview-stats.json');
});

function readStats(root = process.cwd(), outputDir = DEFAULT_OUTPUT_DIR) {
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
