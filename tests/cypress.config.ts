import { defineConfig } from 'cypress';
import { archiveCypress } from '../src/cypress-api';

export default defineConfig({
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
