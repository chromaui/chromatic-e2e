import { defineConfig } from 'cypress';
import { installPlugin } from '../dist';
import { existsSync } from 'node:fs';

export default defineConfig({
  env: {
    // used in tests for external-domain-but-archived resources
    assetDomains: ['some.external'],
  },
  // `downloadsFolder` cannot be overridden in tests, so we're setting
  // this to a non-default value for asserting in the tests
  downloadsFolder: 'cypress/test-downloads',
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: '../../../test-server/fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      installPlugin(on, config);
      on('task', {
        directoryExists(directoryName) {
          return existsSync(directoryName);
        },
      });
    },
  },
});
