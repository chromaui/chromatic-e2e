import { defineConfig } from 'cypress';
import { setupNetworkListener, onBeforeBrowserLaunch, saveArchives } from '../src/cypress-api';

export default defineConfig({
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: 'fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        setupNetworkListener,
        saveArchives,
      });
      on('before:browser:launch', async (browser, launchOptions) => {
        await onBeforeBrowserLaunch(browser, launchOptions);

        return launchOptions;
      });
    },
  },
});
