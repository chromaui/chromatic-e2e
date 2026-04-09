import { test, expect, inject } from 'vitest';
import { commands } from 'vitest/browser';
import { InternalTestContext } from '../types';

test<InternalTestContext>('setupFile is registered', async (context) => {
  expect(context.task.meta.__chromatic_isRegistered).toBe(true);
  expect(context.task.meta.__chromatic_isTakeSnapshotCalled).toBe(false);
});

test('browser commands are available', () => {
  const chromaticCommands = Object.entries(commands).filter(([name]) =>
    name.startsWith('__chromatic_')
  );

  expect(Object.fromEntries(chromaticCommands)).toMatchInlineSnapshot(`
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

test('getOptions', async () => {
  const options = await commands.__chromatic_getOptions();
  options.outputDirectory = options.outputDirectory.replace(inject('processCwd'), '<process-cwd>');

  expect(options).toMatchInlineSnapshot(`
    {
      "assetDomains": [],
      "disableAutoSnapshot": false,
      "idleNetworkInterval": 100,
      "outputDirectory": ".vitest/chromatic",
      "resourceArchiveTimeout": 10000,
    }
  `);
});
