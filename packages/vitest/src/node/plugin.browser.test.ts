import { test, expect, inject } from 'vitest';

test('provided __chromatic_options', async () => {
  expect(inject('__chromatic_options')).toMatchInlineSnapshot(`
    {
      "assetDomains": [],
      "disableAutoSnapshot": false,
      "idleNetworkInterval": 100,
      "outputDirectory": ".vitest/chromatic",
      "reporter": {
        "enabled": true,
        "verbose": true,
      },
      "resourceArchiveTimeout": 10000,
      "turboSnap": false,
    }
  `);
});
