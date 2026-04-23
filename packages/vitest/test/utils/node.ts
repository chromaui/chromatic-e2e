// v8 ignore file

import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { stripVTControlCharacters } from 'node:util';
import { type Mock, vi } from 'vitest';
import { type CliOptions, createVitest, type InlineConfig, startVitest } from 'vitest/node';
import { playwright } from '@vitest/browser-playwright';
import { chromaticPlugin } from '../../src/node/plugin';

export function getBrowserConfig() {
  return {
    enabled: true,
    headless: true,
    screenshotFailures: false,
    provider: playwright(),
    instances: [{ browser: 'chromium', name: 'chromium' }],
  } satisfies NonNullable<InlineConfig['browser']>;
}

export async function runFixture(
  options: CliOptions,
  pluginOptions: Parameters<typeof chromaticPlugin>[0] | { disabled: true } = {}
) {
  const { streams, getOutput } = createOutputStreams();

  const vitest = await startVitest(
    'test',
    [],
    { config: false },
    {
      plugins: ['disabled' in pluginOptions ? undefined : chromaticPlugin(pluginOptions)],
      test: {
        watch: false,
        root: resolve(import.meta.dirname, '../fixtures'),
        browser: getBrowserConfig(),
        ...options,
      },
    },
    streams
  );
  await vitest.close();

  return getOutput();
}

export async function getResolvedConfig(
  options: InlineConfig = {},
  pluginOptions: Parameters<typeof chromaticPlugin>[0] = {}
) {
  const vitest = await createVitest(
    'test',
    { config: false, watch: false, browser: options.browser || getBrowserConfig() },
    { plugins: [chromaticPlugin(pluginOptions)], test: options },
    createOutputStreams().streams
  );
  await vitest.close();

  return vitest.projects[0].config;
}

export function createOutputStreams() {
  const stdout = vi.fn().mockImplementation((_chunk, _encoding, _callback) => _callback?.());
  const stderr = vi.fn().mockImplementation((_chunk, _encoding, _callback) => _callback?.());

  return {
    streams: { stdout: new Writable({ write: stdout }), stderr: new Writable({ write: stderr }) },
    getOutput: () => ({ stdout: formatStreamCalls(stdout), stderr: formatStreamCalls(stderr) }),
  };
}

function formatStreamCalls({ mock }: Mock) {
  return stripVTControlCharacters(mock.calls.map(([chunk]) => chunk).join('')).trimEnd();
}
