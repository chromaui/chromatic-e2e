import { defineConfig } from 'cypress';
import { installPlugin } from '../src';

export default defineConfig({
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: '../../../test-server/fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      installPlugin(on, config);
    },
  },
});
