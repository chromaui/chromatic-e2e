import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { type TestModule } from 'vitest/node';
import { chromaticPlugin } from './plugin';
import { getBrowserConfig, getResolvedConfig, runFixture } from '../../test/utils/node';

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
      "__chromatic_uploadDOMSnapshot": [Function],
      "__chromatic_waitForIdleNetwork": [Function],
      "__chromatic_writeTestResult": [Function],
    }
  `);
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
