import { existsSync, rmSync } from 'node:fs';
import { normalize, resolve } from 'node:path';
import { expect, onTestFinished, test, vi } from 'vitest';
import * as shared from '@chromatic-com/shared-e2e';
import { runFixture as baseRunFixture, StableTestFileOrderSorter } from '../../test/utils/node';
import { DEFAULT_OUTPUT_DIR } from '../constants';

vi.mock('@chromatic-com/shared-e2e');
vi.mocked(shared.writeTestResult).mockImplementation(() => Promise.resolve());

test('default reporter', async () => {
  const { stdout } = await runFixture({ reporters: 'default' });

  expect(trimReporterOutput(stdout)).toMatchInlineSnapshot(`
    " RUN  v[...] <process-cwd>/packages/vitest/test/fixtures

     ✓  chromium  reporter-1.test.ts (3 tests) <time>
                  (6 archives captured)
     ✓  chromium  reporter-2.test.ts (4 tests) <time>
                  (8 archives captured)
     ✓  chromium  reporter-3.test.ts (5 tests) <time>
                  (10 archives captured)
    "
  `);
});

test('tree reporter', async () => {
  const { stdout } = await runFixture({ reporters: 'tree' });

  expect(trimReporterOutput(stdout)).toMatchInlineSnapshot(`
    " RUN  v[...] <process-cwd>/packages/vitest/test/fixtures

     ✓  chromium  reporter-1.test.ts (3 tests) <time>
       ✓ test #1 <time>
       ✓ test #2 <time>
       ✓ test #3 <time>
       (6 archives captured)
     ✓  chromium  reporter-2.test.ts (4 tests) <time>
       ✓ test #1 <time>
       ✓ test #2 <time>
       ✓ test #3 <time>
       ✓ test #4 <time>
       (8 archives captured)
     ✓  chromium  reporter-3.test.ts (5 tests) <time>
       ✓ test #1 <time>
       ✓ test #2 <time>
       ✓ test #3 <time>
       ✓ test #4 <time>
       ✓ test #5 <time>
       (10 archives captured)
    "
  `);
});

test('verbose reporter', async () => {
  const { stdout } = await runFixture({ reporters: 'verbose' });

  expect(trimReporterOutput(stdout)).toMatchInlineSnapshot(`
    " RUN  v[...] <process-cwd>/packages/vitest/test/fixtures

     ✓  chromium  reporter-1.test.ts > test #1 <time>
                  (2 archives captured)
     ✓  chromium  reporter-1.test.ts > test #2 <time>
                  (2 archives captured)
     ✓  chromium  reporter-1.test.ts > test #3 <time>
                  (2 archives captured)
     ✓  chromium  reporter-2.test.ts > test #1 <time>
                  (2 archives captured)
     ✓  chromium  reporter-2.test.ts > test #2 <time>
                  (2 archives captured)
     ✓  chromium  reporter-2.test.ts > test #3 <time>
                  (2 archives captured)
     ✓  chromium  reporter-2.test.ts > test #4 <time>
                  (2 archives captured)
     ✓  chromium  reporter-3.test.ts > test #1 <time>
                  (2 archives captured)
     ✓  chromium  reporter-3.test.ts > test #2 <time>
                  (2 archives captured)
     ✓  chromium  reporter-3.test.ts > test #3 <time>
                  (2 archives captured)
     ✓  chromium  reporter-3.test.ts > test #4 <time>
                  (2 archives captured)
     ✓  chromium  reporter-3.test.ts > test #5 <time>
                  (2 archives captured)
    "
  `);
});

test.each(['default', 'tree', 'verbose'] as const)(
  '%s reporter with { verbose: false }',
  async (builtInReporter) => {
    const { stdout } = await runFixture(
      { reporters: builtInReporter },
      { reporter: { verbose: false } }
    );

    const output = trimReporterOutput(stdout);

    expect(output).not.toContain('archive');
    expect(output).not.toContain('captured');
  }
);

test('summary when default root', async () => {
  onTestFinished(() => {
    const reports = resolve(process.cwd(), DEFAULT_OUTPUT_DIR);

    if (existsSync(reports)) {
      rmSync(reports, { recursive: true, force: true });
    }
  });

  const { stdout } = await runFixture({ reporters: 'default', root: process.cwd() });

  expect(trimSummary(stdout)).toMatchInlineSnapshot(`
    "Chromatic Visual Regression

    ✓ 24 archives captured

    Archives saved in <process-cwd>/.vitest/chromatic
    To upload archives into Chromatic run chromatic --vitest --project-token=<TOKEN>"
  `);
});

test('summary when custom root', async () => {
  const { stdout } = await runFixture({ reporters: 'default' });

  expect(trimSummary(stdout)).toMatchInlineSnapshot(`
    "Chromatic Visual Regression

    ✓ 24 archives captured

    Archives saved in <process-cwd>/packages/vitest/test/fixtures/.vitest/chromatic
    To upload archives into Chromatic run CHROMATIC_ARCHIVE_LOCATION=packages/vitest/test/fixtures/.vitest/chromatic chromatic --vitest --project-token=<TOKEN>"
  `);
});

test('summary when custom output directory', async () => {
  const outputDirectory = '.vitest/custom-output-directory';

  onTestFinished(() => {
    const reports = resolve(process.cwd(), outputDirectory);

    if (existsSync(reports)) {
      rmSync(reports, { recursive: true, force: true });
    }
  });

  const { stdout } = await runFixture(
    { reporters: 'default', root: process.cwd() },
    { outputDirectory }
  );

  expect(trimSummary(stdout)).toMatchInlineSnapshot(`
    "Chromatic Visual Regression

    ✓ 24 archives captured

    Archives saved in <process-cwd>/.vitest/custom-output-directory
    To upload archives into Chromatic run CHROMATIC_ARCHIVE_LOCATION=.vitest/custom-output-directory chromatic --vitest --project-token=<TOKEN>"
  `);
});

test('reporter can be disabled', async () => {
  const { stdout } = await runFixture({ reporters: 'default' }, { reporter: false });

  expect(trimReporterOutput(stdout, 0, Infinity)).toMatchInlineSnapshot(`
    "
     RUN  v[...] <process-cwd>/packages/vitest/test/fixtures

     ✓  chromium  reporter-1.test.ts (3 tests) <time>
     ✓  chromium  reporter-2.test.ts (4 tests) <time>
     ✓  chromium  reporter-3.test.ts (5 tests) <time>

     Test Files  3 passed (3)
          Tests  12 passed (12)
       Start at  <time>
       Duration  <time> (transform <time>, setup <time>, import <time>, tests <time>, environment <time>)"
  `);
});

function runFixture(
  options: Parameters<typeof baseRunFixture>[0],
  pluginOptions?: Parameters<typeof baseRunFixture>[1]
) {
  return baseRunFixture(
    {
      fileParallelism: false,
      sequence: { sequencer: StableTestFileOrderSorter },
      include: [
        /** {@link file://./../../test/fixtures/reporter-1.test.ts} */
        resolve(import.meta.dirname, '../../test/fixtures/reporter-1.test.ts'),
        /** {@link file://./../../test/fixtures/reporter-2.test.ts} */
        resolve(import.meta.dirname, '../../test/fixtures/reporter-2.test.ts'),
        /** {@link file://./../../test/fixtures/reporter-3.test.ts} */
        resolve(import.meta.dirname, '../../test/fixtures/reporter-3.test.ts'),
      ],
      ...options,
    },
    pluginOptions
  );
}

function trimReporterOutput(report: string, start?: number, end?: number) {
  const lines = report.split('\n');
  const startIndex = start ?? lines.findIndex((line) => line.includes('RUN  v'));
  const endIndex = end ?? lines.findIndex((line) => line.includes('Test Files'));

  return lines
    .slice(startIndex, endIndex)
    .join('\n')
    .replaceAll(/\d+ms/g, '<time>')
    .replaceAll(/\d+\.\d+s/g, '<time>')
    .replaceAll(normalize(process.cwd()), '<process-cwd>')
    .replaceAll(/RUN {2}v([\w\-.]+) /g, 'RUN  v[...] ')
    .replaceAll(/(Start at {1,2})\d+:\d+:\d+/g, '$1<time>');
}

function trimSummary(report: string) {
  const lines = report.split('\n');
  const start = lines.findIndex((line) => line.includes('Chromatic Visual Regression'));

  return lines
    .slice(start, -2)
    .map((line) => line.trim())
    .join('\n')
    .replaceAll(normalize(process.cwd()), '<process-cwd>');
}
