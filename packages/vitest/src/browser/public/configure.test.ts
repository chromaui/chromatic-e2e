import { describe, expect, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture } from '../../../test/utils/node';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

describe('configure({ disableAutoSnapshot })', () => {
  /** See {@link file://./../../../test/fixtures/disable-autosnapshot.test.ts} */
  const include = ['disable-autosnapshot.test.ts'];

  test('by default does not disable anything', async () => {
    await runFixture({ include });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`
      [
        "test #1",
        "test #2",
        "test #3",
        "test #4",
        "test #5",
      ]
    `);
  });

  test('{ disableAutoSnapshot: true } on module level affects all tests', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'module' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
  });

  test('{ disableAutoSnapshot: true } on suite level', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'describe' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`
      [
        "test #1",
        "test #5",
      ]
    `);
  });

  test('{ disableAutoSnapshot: true } on nested suite level', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'describe-nested' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`
      [
        "test #1",
        "test #2",
        "test #4",
        "test #5",
      ]
    `);
  });

  test('{ disableAutoSnapshot: true } on test level', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'test' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`[]`);
  });

  test('{ disableAutoSnapshot: true } on a single test', async () => {
    await runFixture({
      include,
      provide: { disableAutoSnapshot: 'test-second' },
    });

    expect(getSnapshottedTests()).toMatchInlineSnapshot(`
      [
        "test #1",
        "test #3",
        "test #4",
        "test #5",
      ]
    `);
  });
});

describe('configure(ChromaticConfig)', () => {
  /** See {@link file://./../../../test/fixtures/configure-options.test.ts} */
  const include = ['configure-options.test.ts'];

  test('configure() on module level affects all tests', async () => {
    const configureOptions = {
      delay: 300,
      diffIncludeAntiAliasing: true,
      diffThreshold: 0.5,
      forcedColors: 'active',
      pauseAnimationAtEnd: true,
      prefersReducedMotion: 'reduce',
      cropToViewport: true,
      ignoreSelectors: ['.ignore-me'],
    };

    await runFixture({
      include,
      provide: {
        configureScope: 'module',
        configureOptions,
      },
    });

    const written = Object.values(getChromaticOptions());
    expect(written).toHaveLength(5);

    for (const options of written) {
      expect(options).toEqual(configureOptions);
    }
  });

  test('configure() on suite level', async () => {
    await runFixture({
      include,
      provide: {
        configureScope: 'describe',
        configureOptions: { delay: 300, ignoreSelectors: ['.example'] },
      },
    });

    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {},
        "test #2": {
          "delay": 300,
          "ignoreSelectors": [
            ".example",
          ],
        },
        "test #3": {
          "delay": 300,
          "ignoreSelectors": [
            ".example",
          ],
        },
        "test #4": {
          "delay": 300,
          "ignoreSelectors": [
            ".example",
          ],
        },
        "test #5": {},
      }
    `);
  });

  test('configure() on nested suite level', async () => {
    await runFixture({
      include,
      provide: {
        configureScope: 'describe-nested',
        configureOptions: { cropToViewport: true, diffThreshold: 0.5 },
      },
    });

    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {},
        "test #2": {},
        "test #3": {
          "cropToViewport": true,
          "diffThreshold": 0.5,
        },
        "test #4": {},
        "test #5": {},
      }
    `);
  });

  test('configure() on test level affects all tests', async () => {
    await runFixture({
      include,
      provide: {
        configureScope: 'test',
        configureOptions: { pauseAnimationAtEnd: true, prefersReducedMotion: 'reduce' },
      },
    });

    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {
          "pauseAnimationAtEnd": true,
          "prefersReducedMotion": "reduce",
        },
        "test #2": {
          "pauseAnimationAtEnd": true,
          "prefersReducedMotion": "reduce",
        },
        "test #3": {
          "pauseAnimationAtEnd": true,
          "prefersReducedMotion": "reduce",
        },
        "test #4": {
          "pauseAnimationAtEnd": true,
          "prefersReducedMotion": "reduce",
        },
        "test #5": {},
      }
    `);
  });

  test('configure() on a single test', async () => {
    await runFixture({
      include,
      provide: {
        configureScope: 'test-second',
        configureOptions: { diffIncludeAntiAliasing: true, forcedColors: 'active' },
      },
    });

    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {},
        "test #2": {
          "diffIncludeAntiAliasing": true,
          "forcedColors": "active",
        },
        "test #3": {},
        "test #4": {},
        "test #5": {},
      }
    `);
  });

  test('configured options override the global plugin options', async () => {
    await runFixture(
      {
        include,
        provide: {
          configureScope: 'test-second',
          configureOptions: { delay: 300, forcedColors: 'changed value here' },
        },
      },
      { delay: 100, diffThreshold: 0.1, forcedColors: 'active' }
    );

    // Test #2 should have overriden options
    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {
          "delay": 100,
          "diffThreshold": 0.1,
          "forcedColors": "active",
        },
        "test #2": {
          "delay": 300,
          "diffThreshold": 0.1,
          "forcedColors": "changed value here",
        },
        "test #3": {
          "delay": 100,
          "diffThreshold": 0.1,
          "forcedColors": "active",
        },
        "test #4": {
          "delay": 100,
          "diffThreshold": 0.1,
          "forcedColors": "active",
        },
        "test #5": {
          "delay": 100,
          "diffThreshold": 0.1,
          "forcedColors": "active",
        },
      }
    `);
  });

  test('disableAutoSnapshot and assetDomains are not written to the result', async () => {
    await runFixture(
      {
        include,
        provide: { configureScope: 'module', configureOptions: { disableAutoSnapshot: false } },
      },
      { assetDomains: ['www.example.com'] }
    );

    expect(getChromaticOptions()).toMatchInlineSnapshot(`
      {
        "test #1": {},
        "test #2": {},
        "test #3": {},
        "test #4": {},
        "test #5": {},
      }
    `);
  });

  test('configure({ title })', async () => {
    await runFixture({
      include,
      provide: {
        configureScope: 'module',
        configureOptions: { title: 'Components/Accordion' },
      },
    });

    const titles = vi
      .mocked(shared.writeTestResult)
      .mock.calls.flatMap((call) => call[0].titlePath);

    expect(titles).toMatchInlineSnapshot(`
      [
        "Components/Accordion",
        "Components/Accordion",
        "Components/Accordion",
        "Components/Accordion",
        "Components/Accordion",
      ]
    `);
  });
});

function getSnapshottedTests() {
  return vi.mocked(shared.writeTestResult).mock.calls.map((call) => {
    return Object.keys(call[1])[0].split(' / ')[0];
  });
}

function getChromaticOptions() {
  return Object.fromEntries(
    vi.mocked(shared.writeTestResult).mock.calls.map((call) => {
      const title = Object.keys(call[1])[0].split(' / ')[0];

      // Options are written to file system as JSON, simulate that in mocked writeTestResult stub:
      const options = JSON.parse(JSON.stringify(call[3]));

      return [title, options];
    })
  );
}
