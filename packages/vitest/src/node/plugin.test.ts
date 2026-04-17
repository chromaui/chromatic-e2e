import { resolve } from 'node:path';
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

test('skips configuration when used on non-browser context', async () => {
  const config = await getResolvedConfig({
    browser: { enabled: false },
  });

  expect(config.setupFiles).toHaveLength(0);
});
