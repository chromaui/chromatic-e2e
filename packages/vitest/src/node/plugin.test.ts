import { resolve } from 'node:path';
import { mkdir, readdir, rm } from 'node:fs/promises';
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

  expect.soft(result).toHaveLength(2);
  expect.soft(result[0]).toBe('<process-cwd>/some-user-defined-setup.ts');
  expect.soft(result[1]).toBe('<process-cwd>/packages/vitest/src/browser/setupFile.ts');
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

  const project = vitest.projects[0];
  project.config.browser.enabled = true;
  project.config.browser.name = 'chromium';

  // @ts-expect-error -- intentional
  vitest.version = '4.0.1';

  // @ts-expect-error -- intentional
  plugin.configureVitest?.({ vitest, project });

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

test('writes results to root when in Vitest projects setup', async () => {
  const root = resolve(import.meta.dirname, '../../test/custom-root');
  await mkdir(root, { recursive: true });
  onTestFinished(() => rm(root, { recursive: true, force: true }));

  await runFixture(
    {
      root,
      projects: [
        {
          plugins: [chromaticPlugin()],
          test: {
            name: 'first-project',
            browser: getBrowserConfig('first-browser'),
            include: ['**/dom.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
          },
        },
        {
          plugins: [chromaticPlugin()],
          test: {
            name: 'second-project',
            browser: getBrowserConfig('second-browser'),
            include: ['**/dom.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
          },
        },
      ],
    },
    { disabled: true }
  );

  const results = await readdir(resolve(root, '.vitest/chromatic/chromatic-archives'));

  // 1 for "archive" directory and 2 for each project's "*.stories.json" files
  expect.soft(results).toHaveLength(3);

  expect(results).toMatchInlineSnapshot(`
    [
      "archive",
      "first-browser-dom-mount-some-elements.stories.json",
      "second-browser-dom-mount-some-elements.stories.json",
    ]
  `);
});

test('skips configuration when used on non-browser context', async () => {
  const config = await getResolvedConfig({
    browser: { enabled: false },
  });

  expect(config.setupFiles).toHaveLength(0);
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

test('works in multi project instance setup', async () => {
  const root = resolve(import.meta.dirname, '../../test/fixtures');
  const tests: TestModule[] = [];

  await runFixture({
    name: 'custom-project-name',
    browser: {
      ...getBrowserConfig(),
      instances: [
        { browser: 'chromium', name: 'custom-name-for-chromium-browser' },
        { browser: 'webkit', name: 'custom-name-for-webkit-browser' },
        { browser: 'firefox', name: 'custom-name-for-firefox-browser' },
      ],
    },
    reporters: ['default', { onTestRunEnd: (testModules) => void tests.push(...testModules) }],
    /** See {@link file://./../../test/fixtures/public-apis.test.ts} */
    include: ['**/public-apis.test.ts'],
    root,
  });

  // Non-Chromium browsers should not crash
  expect.soft(tests).toHaveLength(3);
  expect.soft(tests[0].state()).toBe('passed');
  expect.soft(tests[1].state()).toBe('passed');
  expect.soft(tests[2].state()).toBe('passed');

  // Results for Chromium should still be written to disk
  const results = await readdir(resolve(root, '.vitest/chromatic/chromatic-archives'));

  expect(results).toMatchInlineSnapshot(`
    [
      "archive",
      "public-apis-calls-takesnapshot.stories.json",
      "public-apis-calls-waitforidlenetwork.stories.json",
    ]
  `);
});
