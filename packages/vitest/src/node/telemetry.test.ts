import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, expect, onTestFinished, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { chromaticPlugin } from './plugin';
import {
  createTelemetryServer,
  getBrowserConfig,
  runFixture,
  getResolvedConfig as runVitest,
} from '../../test/utils/node';

const { server, setup, onRequest } = createTelemetryServer();

beforeEach(async () => {
  vi.unstubAllEnvs();
  const cleanup = setup();

  process.env.CHROMATIC_DISABLE_TELEMETRY = '0';

  return function afterEach() {
    cleanup();
    process.env.CHROMATIC_DISABLE_TELEMETRY = '1';
  };
});

test('telemetry is enabled by default', async () => {
  await runVitest();

  expect(onRequest).toHaveBeenCalled();
});

test('telemetry is disabled when { telemetry: false }', async () => {
  await runVitest({}, { telemetry: false });

  expect(onRequest).not.toHaveBeenCalled();
});

test.each(['CHROMATIC_DISABLE_TELEMETRY', 'DO_NOT_TRACK'])(
  'telemetry is disabled when %s is set',
  async (envVar) => {
    vi.stubEnv(envVar, '1');
    await runVitest();

    expect(onRequest).not.toHaveBeenCalled();
  }
);

test('telemetry is sent to custom telemetry endpoint when CHROMATIC_TELEMETRY_URL is set', async () => {
  const url = 'https://custom-endpoint.chromatic.com/telemetry';
  vi.stubEnv('CHROMATIC_TELEMETRY_URL', url);

  const onCustomEndpointRequest = vi.fn();

  server.use(
    http.post(`${url}/telemetry/v1/vitest/events`, async () => {
      onCustomEndpointRequest('called here');
      return HttpResponse.json({ ok: true });
    })
  );
  await runVitest();

  expect(onCustomEndpointRequest).toHaveBeenCalledWith('called here');
});

test('hanging telemetry endpoint does not block Vitest shutdown', async () => {
  // Patch AbortSignal as Sinon does not support mocking it: https://github.com/sinonjs/fake-timers/issues/521
  {
    const timeout = AbortSignal.timeout;
    onTestFinished(() => void (AbortSignal.timeout = timeout));

    AbortSignal.timeout = function mockedTimeout(n: number) {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), n);
      return controller.signal;
    };
  }

  const url = 'https://unresponsive-endpoint.chromatic.com/telemetry';
  vi.stubEnv('CHROMATIC_TELEMETRY_URL', url);

  const isFetching = new Promise<void>((fetchStarted) => {
    server.use(
      http.post(`${url}/telemetry/v1/vitest/events`, async () => {
        fetchStarted();
        await new Promise((_resolve) => {});
      })
    );
  });

  vi.useFakeTimers({ toFake: ['setTimeout'] });
  onTestFinished(() => void vi.useRealTimers());

  let done = false;
  const promise = runVitest().then(() => (done = true));

  await isFetching;

  vi.advanceTimersByTime(3_000);
  expect(done).toBe(false);

  vi.advanceTimersByTime(1_999);
  expect(done).toBe(false);

  vi.advanceTimersByTime(1);

  // Vitest should exit without hanging forever
  await expect(promise).resolves.toBeTruthy();
});

test('telemetry is logged to file when { telemetry: { logToFile: true }} ', async () => {
  const { root } = await runVitest({}, { telemetry: { logToFile: true } });

  const rows = readLogFile(root);

  const configureEvents = rows.filter((row) => row.eventType === 'vitest_plugin_configured');
  expect(configureEvents.length).toBe(1);
});

test('telemetry is logged to file when CHROMATIC_TELEMETRY_LOG_TO_FILE is set', async () => {
  vi.stubEnv('CHROMATIC_TELEMETRY_LOG_TO_FILE', '1');
  const { root } = await runVitest();

  const rows = readLogFile(root);

  const configureEvents = rows.filter((row) => row.eventType === 'vitest_plugin_configured');
  expect(configureEvents.length).toBe(1);
});

test('telemetry is not logged to file by default ', async () => {
  const { root } = await runVitest();

  expect(existsSync(resolve(root, '.vitest/chromatic/telemetry.jsonl'))).toBe(false);
});

test('attaches common fields and metadata to telemetry events', async () => {
  const time = '2026-01-01T00:00:00.000Z';
  vi.setSystemTime(new Date(time));
  onTestFinished(() => void vi.useRealTimers());

  await runVitest();

  const event = vi.mocked(onRequest).mock.calls[0][0];

  expect(event).toMatchObject({
    id: expect.any(String),
    sessionId: expect.any(String),
    projectId: expect.any(String),
    timestamp: time,
    eventType: expect.any(String),
    level: expect.toBeOneOf(['info', 'warn', 'error']),
    payload: expect.any(Object),
    metadata: {
      isCI: expect.toBeOneOf([true, false]),
      isVitestProjects: false,
      pluginVersion: expect.any(String),
      nodeVersion: process.versions.node,
      vitestVersion: expect.any(String),
      packageManager: 'pnpm',
      packageManagerVersion: expect.any(String),
      chromaticVersion: expect.any(String),
    },
  });
});

test('sets isVitestProjects true when multiple Vitest projects', async () => {
  await runFixture(
    {
      projects: [
        {
          plugins: [chromaticPlugin()],
          test: {
            include: ['**/dom.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
            browser: getBrowserConfig('first-browser'),
          },
        },
        {
          plugins: [chromaticPlugin()],
          test: {
            include: ['**/dom.test.ts'],
            root: resolve(import.meta.dirname, '../../test/fixtures'),
            browser: getBrowserConfig('second-browser'),
          },
        },
      ],
    },
    { disabled: true }
  );
  const events = vi.mocked(onRequest).mock.calls.map(([event]) => event);

  expect.soft(events).toHaveLength(2);
  expect.soft(events[0]?.metadata).toHaveProperty('isVitestProjects', true);
  expect.soft(events[1]?.metadata).toHaveProperty('isVitestProjects', true);
});

function readLogFile(root: string) {
  const output = readFileSync(resolve(root, '.vitest/chromatic/telemetry.jsonl'), 'utf8');
  const rows: Record<string, unknown>[] = [];

  for (const row of output.split('\n')) {
    const content = row.trim();

    if (content) {
      rows.push(JSON.parse(content));
    }
  }

  return rows;
}
