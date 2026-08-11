import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { beforeEach, describe, expect, onTestFinished, test as base, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { chromaticPlugin } from './plugin';
import { session, TELEMETRY_METADATA_FILE, type WireTelemetryEvent } from './telemetry';
import {
  getBrowserConfig,
  runFixture,
  getResolvedConfig as runVitest,
  setupTelemetryServer,
} from '../../test/utils/node';

vi.mock('node:fs', { spy: true });

beforeEach(() => {
  vi.mocked(existsSync).mockReset();
  vi.unstubAllEnvs();
  session.dotEnv = undefined;
});

describe('configuration', () => {
  test('telemetry is enabled by default', async ({ onRequest }) => {
    await runVitest();

    expect(onRequest).toHaveBeenCalled();
  });

  test('telemetry is disabled when { telemetry: false }', async ({ onRequest }) => {
    const { root } = await runVitest({}, { telemetry: false });

    expect(onRequest).not.toHaveBeenCalled();

    const metadataJson = resolve(root, `.vitest/chromatic/${TELEMETRY_METADATA_FILE}`);
    expect(existsSync(metadataJson), `Expected ${metadataJson} not to exist`).toBe(false);
  });

  test.for(['CHROMATIC_DISABLE_TELEMETRY', 'DO_NOT_TRACK'])(
    'telemetry is disabled when %s is set',
    async (envVar, { onRequest }) => {
      vi.stubEnv(envVar, '1');
      await runVitest();

      expect(onRequest).not.toHaveBeenCalled();
    }
  );

  test.for(['CHROMATIC_DISABLE_TELEMETRY', 'DO_NOT_TRACK'])(
    'telemetry is disabled when %s is set in .env',
    async (envVar, { onRequest }) => {
      vi.stubEnv(envVar, undefined);

      const original = process.cwd();
      onTestFinished(() => void process.chdir(original));

      const cwd = resolve(import.meta.dirname, `../../test/fixtures/dotenvs/${envVar}`);
      process.chdir(cwd);

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

  test('metadata file is written', async () => {
    const { root } = await runVitest();

    const filename = resolve(root, `.vitest/chromatic/${TELEMETRY_METADATA_FILE}`);
    expect(existsSync(filename), `Expected metadata file to exist at ${filename}`).toBe(true);

    const json = JSON.parse(readFileSync(filename, 'utf8'));

    expect(json).toMatchObject({
      sessionId: expect.any(String),
      projectId: expect.any(String),
      isCI: expect.any(Boolean),
      pluginVersion: expect.any(String),
      nodeVersion: expect.any(String),
      vitestVersion: expect.any(String),
      isVitestProjects: false,
      packageManager: 'pnpm',
      packageManagerVersion: expect.any(String),
      chromaticVersion: expect.any(String),
    });
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
  test('all events in order', async ({ getEvents }) => {
    expect(getEvents().map((event) => event.eventType)).toMatchInlineSnapshot(`
      [
        "vitest_plugin_configured",
        "vitest_run_started",
        "vitest_snapshot_captured",
        "vitest_snapshot_captured",
        "vitest_snapshot_captured",
        "vitest_archives_created",
        "vitest_snapshot_captured",
        "vitest_snapshot_captured",
        "vitest_archives_created",
        "vitest_run_ended",
      ]
    `);
  });

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
            "isShardedRun": false,
            "reporter": "verbose",
            "resourceArchiveTimeout": 1234,
            "tagsCount": 0,
            "turboSnap": true,
          },
        },
      ]
    `);
  });

  test('plugin_configured in Vitest sharded run', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
    await runVitest({ shard: '1/2' });

    const pluginConfiguredEvents = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_plugin_configured'
        ? [event as WireTelemetryEvent<'plugin_configured'>]
        : []
    );

    expect(pickTypeAndPayload(pluginConfiguredEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_plugin_configured",
          "payload": {
            "assetDomainsCount": 0,
            "disableAutoSnapshot": false,
            "idleNetworkInterval": 100,
            "ignoreSelectorsCount": 0,
            "isCustomOutputDirectory": false,
            "isShardedRun": true,
            "reporter": "verbose",
            "resourceArchiveTimeout": 10000,
            "tagsCount": 0,
            "turboSnap": false,
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
      event.eventType === 'vitest_project_ineligible' ? [event] : []
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

  test('run_started', async ({ getEvents }) => {
    const startEvents = getEvents('vitest_run_started');

    expect(pickTypeAndPayload(startEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_run_started",
          "payload": {},
        },
      ]
    `);
  });

  test('run_ended', async ({ getEvents }) => {
    const endEvents = getEvents('vitest_run_ended');

    expect(pickTypeAndPayload(endEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_run_ended",
          "payload": {
            "snapshotCount": 5,
          },
        },
      ]
    `);
  });

  test('snapshot_captured', async ({ getEvents }) => {
    const snapshotsCapturedEvents = getEvents('vitest_snapshot_captured');

    expect(pickTypeAndPayload(snapshotsCapturedEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_snapshot_captured",
          "payload": {
            "colorScheme": "light",
            "isAutomaticSnapshot": false,
            "isCustomName": true,
          },
        },
        {
          "eventType": "vitest_snapshot_captured",
          "payload": {
            "colorScheme": "light",
            "isAutomaticSnapshot": false,
            "isCustomName": true,
          },
        },
        {
          "eventType": "vitest_snapshot_captured",
          "payload": {
            "colorScheme": "light",
            "isAutomaticSnapshot": true,
            "isCustomName": false,
          },
        },
        {
          "eventType": "vitest_snapshot_captured",
          "payload": {
            "colorScheme": "light",
            "isAutomaticSnapshot": false,
            "isCustomName": false,
          },
        },
        {
          "eventType": "vitest_snapshot_captured",
          "payload": {
            "colorScheme": "light",
            "isAutomaticSnapshot": true,
            "isCustomName": false,
          },
        },
      ]
    `);
  });

  test('take_snapshot_invalid_call - called outside test', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
    await runFixture({
      include: ['**/take-snapshot.test.ts'],
      provide: { testName: 'two' },
    });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_take_snapshot_invalid_call' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_take_snapshot_invalid_call",
          "payload": {
            "isInsideTest": false,
          },
        },
      ]
    `);
  });

  test('take_snapshot_invalid_call - not registered test', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
    await runFixture(
      {
        include: ['**/take-snapshot.test.ts'],
        provide: { testName: 'one' },
        tags: [{ name: 'example' }],
      },
      { tags: ['example'] }
    );

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_take_snapshot_invalid_call' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_take_snapshot_invalid_call",
          "payload": {
            "isInsideTest": true,
            "isRegisteredTest": false,
          },
        },
      ]
    `);
  });

  test('take_snapshot_invalid_call - not awaited', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
    await runFixture({
      include: ['**/take-snapshot.test.ts'],
      provide: { testName: 'three' },
    });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_take_snapshot_invalid_call' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_take_snapshot_invalid_call",
          "payload": {
            "isAwaited": false,
            "isInsideTest": true,
            "isRegisteredTest": true,
          },
        },
      ]
    `);
  });

  test('archives_created', async ({ getEvents }) => {
    const archivesCreatedEvents = getEvents('vitest_archives_created');

    expect(pickTypeAndPayload(archivesCreatedEvents)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_archives_created",
          "payload": {
            "archiveCount": 3,
          },
        },
        {
          "eventType": "vitest_archives_created",
          "payload": {
            "archiveCount": 2,
          },
        },
      ]
    `);
  });

  test('configure_called', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/configure-calls.test.ts} */
    await runFixture({ include: ['**/configure-calls.test.ts'] });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_configure_called' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_configure_called",
          "payload": {
            "options": [
              "delay",
              "title",
            ],
            "scope": "file",
          },
        },
        {
          "eventType": "vitest_configure_called",
          "payload": {
            "options": [
              "diffThreshold",
              "resourceArchiveTimeout",
            ],
            "scope": "test",
          },
        },
        {
          "eventType": "vitest_configure_called",
          "payload": {
            "options": [
              "ignoreSelectors",
            ],
            "scope": "suite",
          },
        },
      ]
    `);
  });

  test('wait_for_idle_network_called', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/wait-for-idle-network.test.ts} */
    await runFixture({
      include: ['**/wait-for-idle-network.test.ts'],
      provide: { testName: 'three' },
    });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_wait_for_idle_network_called' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_wait_for_idle_network_called",
          "payload": {
            "timeout": 2,
          },
        },
      ]
    `);
  });

  test('wait_for_idle_network_invalid_call - called outside test', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/wait-for-idle-network.test.ts} */
    await runFixture({
      include: ['**/wait-for-idle-network.test.ts'],
      provide: { testName: 'two' },
    });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_wait_for_idle_network_invalid_call' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_wait_for_idle_network_invalid_call",
          "payload": {
            "isCalledByUser": true,
            "isInsideTest": false,
          },
        },
      ]
    `);
  });

  test('wait_for_idle_network_invalid_call - not registered test', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/wait-for-idle-network.test.ts} */
    await runFixture(
      {
        include: ['**/wait-for-idle-network.test.ts'],
        provide: { testName: 'one' },
        tags: [{ name: 'example' }],
      },
      { tags: ['example'] }
    );

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_wait_for_idle_network_invalid_call' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_wait_for_idle_network_invalid_call",
          "payload": {
            "isCalledByUser": true,
            "isInsideTest": true,
            "isRegisteredTest": false,
          },
        },
      ]
    `);
  });

  test('wait_for_idle_network_timeout', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/wait-for-idle-network.test.ts} */
    await runFixture(
      {
        include: ['**/wait-for-idle-network.test.ts'],
        provide: { testName: 'three' },
      },
      { idleNetworkInterval: 1 }
    );

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_wait_for_idle_network_timeout' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_wait_for_idle_network_timeout",
          "payload": {
            "isCalledByUser": true,
            "timeout": 2,
          },
        },
      ]
    `);
  });

  test('setup_files_parallel', async ({ onRequest }) => {
    /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
    await runFixture({
      include: ['**/take-snapshot.test.ts'],
      provide: { testName: 'four' },
      setupFiles: ['custom-setup-file.ts'],
      sequence: { hooks: 'parallel' },
    });

    const events = onRequest.mock.calls.flatMap(([event]) =>
      event.eventType === 'vitest_setup_files_parallel' ? [event] : []
    );

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_setup_files_parallel",
          "payload": {
            "setupFileCount": 1,
          },
        },
      ]
    `);
  });

  test('archive-storybook called successfully', async ({ archivesDirectory, onRequest }) => {
    onRequest.mockClear();
    await runBinary('archive-storybook', { archivesDirectory });

    const events = getSortedEvents(onRequest);

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_dev_started",
          "payload": {},
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "archiveStorybook",
            "isCustomLocation": true,
            "success": true,
          },
        },
      ]
    `);
  });

  test('archive-storybook called erroneously', async ({ archivesDirectory, onRequest }) => {
    const error = new Error(`Example error with ${process.cwd()} and ${homedir()}`);
    error.stack = `Example stack:\nwith cwd ${process.cwd()}\nand homedir ${homedir()}`;

    onRequest.mockClear();
    await runBinary('archive-storybook', { archivesDirectory, error });

    const events = getSortedEvents(onRequest);

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_dev_started",
          "payload": {},
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "archiveStorybook",
            "isCustomLocation": true,
            "success": true,
          },
        },
        {
          "eventType": "vitest_storybook_dev_failed",
          "payload": {
            "error": "Example error with <process-cwd> and <homedir>
      Stack: Example stack:
      with cwd <process-cwd>
      and homedir <homedir>",
          },
        },
      ]
    `);
  });

  test('archive-storybook called with directory without chromatic-archives', async ({
    archivesDirectory,
    onRequest,
  }) => {
    vi.mocked(existsSync).mockImplementation(
      (path) => path !== `${archivesDirectory}/chromatic-archives`
    );
    onRequest.mockClear();
    await runBinary('archive-storybook', { archivesDirectory });

    const events = getSortedEvents(onRequest);

    // Normalize error stack
    events.forEach((event) => {
      if ('error' in event.payload && typeof event.payload.error === 'string') {
        event.payload.error = event.payload.error.split(/^\s+at /gm)[0]?.trim();
      }
    });

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_dev_started",
          "payload": {},
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "archiveStorybook",
            "isCustomLocation": true,
            "success": false,
          },
        },
        {
          "eventType": "vitest_storybook_dev_failed",
          "payload": {
            "error": "Error: Chromatic archives directory cannot be found: <process-cwd>/packages/vitest/test/fixtures/.vitest/chromatic/chromatic-archives

      Please make sure that you have run your E2E tests, or have set the CHROMATIC_ARCHIVE_LOCATION env var if the output directory for the tests is not in the standard location.",
          },
        },
      ]
    `);
  });

  test('build-archive-storybook called successfully', async ({ archivesDirectory, onRequest }) => {
    onRequest.mockClear();
    await runBinary('build-archive-storybook', { archivesDirectory });

    const events = getSortedEvents(onRequest);

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_build_started",
          "payload": {
            "isCalledFromCLI": false,
          },
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "buildArchiveStorybook",
            "isCustomLocation": true,
            "success": true,
          },
        },
        {
          "eventType": "vitest_storybook_build_completed",
          "payload": {
            "success": true,
          },
        },
      ]
    `);
  });

  test('build-archive-storybook called successfully from CLI', async ({
    archivesDirectory,
    onRequest,
  }) => {
    onRequest.mockClear();
    vi.stubEnv('STORYBOOK_INVOKED_BY', 'chromatic');

    await runBinary('build-archive-storybook', { archivesDirectory });

    const events = getSortedEvents(onRequest);

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_build_started",
          "payload": {
            "isCalledFromCLI": true,
          },
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "buildArchiveStorybook",
            "isCustomLocation": true,
            "success": true,
          },
        },
        {
          "eventType": "vitest_storybook_build_completed",
          "payload": {
            "success": true,
          },
        },
      ]
    `);
  });

  test('build-archive-storybook called erroneously', async ({ archivesDirectory, onRequest }) => {
    const error = new Error(`Example error with ${process.cwd()} and ${homedir()}`);
    error.stack = `Example stack:\nwith cwd ${process.cwd()}\nand homedir ${homedir()}`;

    onRequest.mockClear();
    await runBinary('build-archive-storybook', { archivesDirectory, error });

    const events = getSortedEvents(onRequest);

    expect(pickTypeAndPayload(events)).toMatchInlineSnapshot(`
      [
        {
          "eventType": "vitest_storybook_build_started",
          "payload": {
            "isCalledFromCLI": false,
          },
        },
        {
          "eventType": "vitest_archives_resolved",
          "payload": {
            "command": "buildArchiveStorybook",
            "isCustomLocation": true,
            "success": true,
          },
        },
        {
          "eventType": "vitest_storybook_build_completed",
          "payload": {
            "error": "Example error with <process-cwd> and <homedir>
      Stack: Example stack:
      with cwd <process-cwd>
      and homedir <homedir>",
            "success": false,
          },
        },
      ]
    `);
  });

  test.for(['archive-storybook', 'build-archive-storybook'] as const)(
    '%s based events contain metadata from test run',
    async (command, { archivesDirectory, onRequest, getEvents }) => {
      onRequest.mockClear();
      await runBinary(command, { archivesDirectory });

      // Data from telemetry-metadata.json should be found in CLI invoked events
      const testRunEvent = getEvents()[0];

      for (const event of onRequest.mock.calls.map(([event]) => event)) {
        expect.soft(event).toHaveProperty('sessionId', testRunEvent.sessionId);
        expect.soft(event).toHaveProperty('projectId', testRunEvent.projectId);
        expect.soft(event.metadata).toMatchObject(testRunEvent.metadata);
      }
    }
  );

  test.for(['archive-storybook', 'build-archive-storybook'] as const)(
    '%s based events contain fallback metadata when previous test run data is malformed',
    async (command, { onRequest }) => {
      const archivesDirectory = resolve(
        import.meta.dirname,
        '../../test/fixtures/.vitest/malformed-metadata'
      );

      mkdirSync(`${archivesDirectory}/chromatic-archives`, { recursive: true });
      writeFileSync(resolve(archivesDirectory, TELEMETRY_METADATA_FILE), 'malformed json');

      await runBinary(command, { archivesDirectory });

      for (const event of onRequest.mock.calls.map(([event]) => event)) {
        expect.soft(event).toHaveProperty('sessionId', 'unknown');
        expect.soft(event).toHaveProperty('projectId', 'unknown');
        expect.soft(event.metadata).toMatchObject({
          chromaticVersion: 'unknown',
          vitestVersion: 'unknown',
          isVitestProjects: false,
        });
      }
    }
  );
});

const test = base
  .extend('telemetry', { scope: 'file' }, async ({}, { onCleanup }) => {
    const { cleanup, server, onRequest } = setupTelemetryServer();

    // Run a common fixture once before any tests start.
    // Tests that aren't validating edge cases can assert this data.
    const { stdout } = await runFixture(
      /** See {@link file://./../../test/fixtures/take-snapshot.test.ts} */
      { include: ['take-snapshot.test.ts'], provide: { testName: 'five' } },
      {
        ignoreSelectors: ['.ignore-me'],
        assetDomains: ['https://one.chromatic.com', 'https://two.chromatic.com'],
        turboSnap: true,
        resourceArchiveTimeout: 1234,
        disableAutoSnapshot: false,
      }
    );

    const archivesDirectory = stdout.match(/Archives saved in (.*)/m)[1].trim();

    const events = getSortedEvents(onRequest);

    onRequest.mockClear();
    onCleanup(cleanup);

    return { events, cleanup, server, onRequest, archivesDirectory };
  })
  .extend('server', ({ telemetry }) => telemetry.server)
  .extend('onRequest', ({ telemetry }) => telemetry.onRequest)
  .extend('archivesDirectory', ({ telemetry }) => telemetry.archivesDirectory)
  .extend('getEvents', ({ telemetry }) => {
    return function getEvents(type?: WireTelemetryEvent['eventType']) {
      if (!type) {
        return telemetry.events;
      }
      return telemetry.events.filter((event) => event.eventType === type);
    };
  });

function getSortedEvents(onRequest: ReturnType<typeof setupTelemetryServer>['onRequest']) {
  return onRequest.mock.calls
    .map((call) => call[0])
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

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

const childProcessHandles = vi.hoisted(() => ({ onClose: vi.fn(), onError: vi.fn() }));
vi.mock(import('child_process'), async (importOriginal) => {
  return {
    ...(await importOriginal()),
    spawn: vi.fn().mockReturnValue({
      on: (event: any, callback: any) => {
        if (event === 'close') {
          childProcessHandles.onClose = callback;
        }
        if (event === 'error') {
          childProcessHandles.onError = callback;
        }
      },
    }),
  };
});

async function runBinary(
  name: 'archive-storybook' | 'build-archive-storybook',
  options: { archivesDirectory: string; error?: Error }
) {
  vi.stubEnv('CHROMATIC_ARCHIVE_LOCATION', options.archivesDirectory);
  vi.resetModules();

  let isDone = false;
  const promise = import(`../bin/${name}.ts`).finally(() => (isDone = true));

  await vi.waitFor(() => isDone || expect(spawn).toHaveBeenCalled(), { timeout: 1_000 });

  if (options.error) {
    childProcessHandles.onError(options.error);
  } else {
    childProcessHandles.onClose(0, null);
  }

  await expect(promise).resolves.toBeTruthy();
}
