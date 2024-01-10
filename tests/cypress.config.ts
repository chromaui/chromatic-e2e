import { defineConfig } from 'cypress';
import { installPlugin } from '../src/cypress-api';

export default defineConfig({
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: 'fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      installPlugin(on);
    },
  },
});
