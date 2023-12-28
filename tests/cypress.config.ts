import { defineConfig } from 'cypress';
import { archiveCypress } from '../src/cypress-api';

export default defineConfig({
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: 'fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        archiveCypress,
      });
    },
  },
});
