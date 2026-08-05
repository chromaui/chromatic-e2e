import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, onTestFinished, test as base, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { chromaticPlugin } from './plugin';
import { type WireTelemetryEvent } from './telemetry';
import {
  getBrowserConfig,
  runFixture,
  getResolvedConfig as runVitest,
  setupTelemetryServer,
} from '../../test/utils/node';

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe('configuration', () => {
  test('telemetry is enabled by default', async ({ onRequest }) => {
    await runVitest();

    expect(onRequest).toHaveBeenCalled();
  });

  test('telemetry is disabled when { telemetry: false }', async ({ onRequest }) => {
    await runVitest({}, { telemetry: false });

    expect(onRequest).not.toHaveBeenCalled();
  });

  test.for(['CHROMATIC_DISABLE_TELEMETRY', 'DO_NOT_TRACK'])(
    'telemetry is disabled when %s is set',
    async (envVar, { onRequest }) => {
      vi.stubEnv(envVar, '1');
      await runVitest();

      expect(onRequest).not.toHaveBeenCalled();
    }
  );

  test('telemetry is sent to custom endpoint when CHROMATIC_TELEMETRY_URL is set', async ({
    onRequest,
    server,
  }) => {
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

    expect.soft(onRequest).not.toHaveBeenCalled();
    expect.soft(onCustomEndpointRequest).toHaveBeenCalledWith('called here');
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

  test('hanging telemetry endpoint does not block Vitest shutdown', async ({ server }) => {
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
});

describe('automatic fields', () => {
  test('attaches common fields and metadata to telemetry events', async ({ onRequest }) => {
    const time = '2026-01-01T00:00:00.000Z';
    vi.setSystemTime(new Date(time));
    onTestFinished(() => void vi.useRealTimers());

    await runVitest();

    const event = onRequest.mock.calls[0][0];

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

  test('sets isVitestProjects true when multiple Vitest projects', async ({ onRequest }) => {
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

    expect.soft(events.length).toBeGreaterThanOrEqual(2);
    expect.soft(events[0]?.metadata).toHaveProperty('isVitestProjects', true);
    expect.soft(events[1]?.metadata).toHaveProperty('isVitestProjects', true);
  });
});

describe('events', () => {
  test.todo('all events in order');

  test('plugin_configured', async ({ getEvents }) => {
    const pluginConfiguredEvents = getEvents('vitest_plugin_configured');

    expect(pickTypeAndPayload(pluginConfiguredEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_plugin_configured",
          "payload": {
            "assetDomainsCount": 2,
            "disableAutoSnapshot": false,
            "idleNetworkInterval": 100,
            "ignoreSelectorsCount": 1,
            "isCustomOutputDirectory": false,
            "reporter": "verbose",
            "resourceArchiveTimeout": 1234,
            "tagsCount": 0,
            "turboSnap": true,
          },
        },
      ]
    `);
  });

  test('plugin_configured in Vitest projects setup', async ({ onRequest }) => {
    await runFixture(
      {
        projects: [
          {
            plugins: [chromaticPlugin({ delay: 1111 })],
            test: {
              name: 'first-project',
              browser: getBrowserConfig('first-browser'),
              include: ['**/dom.test.ts'],
              root: resolve(import.meta.dirname, '../../test/fixtures'),
            },
          },
          {
            plugins: [chromaticPlugin({ delay: 2222 })],
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

    const configuredEvents = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_plugin_configured'
        ? [event as WireTelemetryEvent<'plugin_configured'>]
        : []
    );

    expect.soft(configuredEvents).toHaveLength(2);
    expect.soft(configuredEvents.map((event) => event.payload.delay).sort()).toEqual([1111, 2222]);
  });

  test('project_ineligible', async ({ onRequest }) => {
    await runFixture({
      include: ['**/dom.test.ts'],
      browser: { enabled: false },
    });

    const projectIneligibleEvents = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_project_ineligible'
        ? [event as WireTelemetryEvent<'project_ineligible'>]
        : []
    );

    expect(pickTypeAndPayload(projectIneligibleEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_project_ineligible",
          "payload": {
            "isBrowser": false,
            "isChromium": false,
          },
        },
      ]
    `);
  });
});

const test = base
  .extend('telemetry', { scope: 'file' }, async ({}, { onCleanup }) => {
    const { cleanup, server, onRequest } = setupTelemetryServer();

    // Run a common fixture once before any tests start.
    // Tests that aren't validating edge cases can assert this data.
    await runFixture(
      { include: ['take-snapshot.test.ts'], provide: { testName: 'five' } },
      {
        ignoreSelectors: ['.ignore-me'],
        assetDomains: ['https://one.chromatic.com', 'https://two.chromatic.com'],
        turboSnap: true,
        resourceArchiveTimeout: 1234,
        disableAutoSnapshot: false,
      }
    );

    const events = onRequest.mock.calls
      .map((call) => call[0])
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    onCleanup(cleanup);

    return { events, cleanup, server, onRequest };
  })
  .extend('server', ({ telemetry }) => telemetry.server)
  .extend('onRequest', ({ telemetry }) => telemetry.onRequest)
  .extend('getEvents', ({ telemetry }) => {
    return function getEvents(type?: WireTelemetryEvent['eventType']) {
      if (!type) {
        return telemetry.events;
      }
      return telemetry.events.filter((event) => event.eventType === type);
    };
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

function pickTypeAndPayload(events: WireTelemetryEvent[]) {
  return events.map(({ eventType, payload }) => ({ eventType, payload }));
}
