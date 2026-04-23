import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import { expect, onTestFinished, test } from 'vitest';
import { createVitest, type TestModule } from 'vitest/node';
import { chromaticPlugin } from './plugin';
import {
  createOutputStreams,
  getBrowserConfig,
  getResolvedConfig,
  runFixture,
} from '../../test/utils/node';

test.each([
  { name: 'string', setupFiles: 'some-user-defined-setup.ts' },
  { name: 'array', setupFiles: ['some-user-defined-setup.ts'] },
])("preserves user's $name setupFiles", async ({ setupFiles }) => {
  const config = await getResolvedConfig({ setupFiles });

  const result = config.setupFiles.map((s) => s.replace(process.cwd(), '<process-cwd>'));

  expect(result).toHaveLength(2);
  expect(result[0]).toBe('<process-cwd>/some-user-defined-setup.ts');
  expect(result[1]).toBe('<process-cwd>/packages/vitest/src/browser/setupFile.ts');
});

test('adds browser commands', async () => {
  const config = await getResolvedConfig();

  expect(config.browser.commands).toMatchInlineSnapshot(`
    {
      "__chromatic_getOptions": [Function],
      "__chromatic_getSnapshots": [Function],
      "__chromatic_interceptFetch": [Function],
      "__chromatic_reset": [Function],
      "__chromatic_stopWithoutSnapshots": [Function],
      "__chromatic_uploadDOMSnapshot": [Function],
      "__chromatic_waitForIdleNetwork": [Function],
      "__chromatic_writeTestResult": [Function],
    }
  `);
});

test('adds tags', async () => {
  const config = await getResolvedConfig(undefined, { tags: ['my-tag-for-vrt'] });

  expect(config.tags).toMatchInlineSnapshot(`
    [
      {
        "description": "Visual Regression Tests for \`@chromatic-com/vitest\`",
        "name": "my-tag-for-vrt",
      },
    ]
  `);
});

test('does not override user-defined tags', async () => {
  const config = await getResolvedConfig(
    {
      tags: [{ name: 'my-tag-for-vrt', description: 'Custom description' }],
    },
    { tags: ['my-tag-for-vrt'] }
  );

  expect(config.tags).toMatchInlineSnapshot(`
    [
      {
        "description": "Custom description",
        "name": "my-tag-for-vrt",
      },
    ]
  `);
});

test('warns if tags are used with Vitest 4.0', async () => {
  const { streams, getOutput } = createOutputStreams();
  const plugin = chromaticPlugin({ tags: ['my-tag-for-vrt'] });
  const vitest = await createVitest(
    'test',
    { config: false, standalone: true, watch: true },
    {},
    streams
  );
  onTestFinished(() => vitest.close());

  // @ts-expect-error -- intentional
  vitest.version = '4.0.1';

  plugin.configureVitest?.({ vitest, project: vitest.getRootProject() } as any);

  expect(getOutput().stderr).toContain(
    'chromatic  Tags cannot be used with Vitest 4.0.1. Please upgrade to Vitest 4.1 or later to use this feature.'
  );
});

test('can be scoped to a Vitest project', async () => {
  const tests: TestModule[] = [];

  await runFixture(
    {
      browser: undefined,
      reporters: [{ onTestRunEnd: (testModules) => void tests.push(...testModules) }],
      projects: [
        {
          test: {
            name: 'unit',
            /** See {@link file://./../../test/fixtures/node-environment.test.ts} */
            include: ['**/node-environment.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
          },
        },
        {
          plugins: [chromaticPlugin()],
          test: {
            name: 'vrt',
            /** See {@link file://./../../test/fixtures/dom.test.ts} */
            include: ['**/dom.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
            browser: getBrowserConfig(),
          },
        },
      ],
    },
    { disabled: true }
  );

  expect(tests).toHaveLength(2);
  expect(tests[0].state()).toBe('passed');
  expect(tests[1].state()).toBe('passed');
});

test('warns when used on non-browser context', async () => {
  const { stderr } = await runFixture({
    browser: undefined,
    /** See {@link file://./../../test/fixtures/node-environment.test.ts} */
    include: ['**/node-environment.test.ts'],
    root: resolve(import.meta.dirname, '../../test/fixtures'),
  });

  expect(stderr).toContain('chromatic  Plugin is used in a non-browser context.');
});

test('does not clean existing output directory when "vitest --merge-reports" is run', async () => {
  const options = {
    /** See {@link file://./../../test/fixtures/dom.test.ts} */
    include: ['**/dom.test.ts'],
    root: resolve(import.meta.dirname, '../../test/fixtures'),
  };

  const outputDir = resolve(options.root, '.vitest-reports');
  const outputFile = resolve(outputDir, 'blob.json');

  // First run to generate blob
  await runFixture({ reporters: [['blob', { outputFile }]], ...options });

  // Second with --merge-reports to see if .vitest/chromatic is accidentally removed
  const { stdout, stderr } = await runFixture({ mergeReports: outputDir, ...options });

  expect(stdout).toContain('Test Files  1 passed (1)\n');
  expect(stdout).toContain('Tests  1 passed (1)\n');
  expect(stderr).toBe('');

  // Chromatic results should preserve on file system
  const archives = resolve(options.root, '.vitest/chromatic/chromatic-archives');
  await expect(readdir(archives)).resolves.toMatchInlineSnapshot(`
    [
      "archive",
      "dom-mount-some-elements.stories.json",
    ]
  `);
});
