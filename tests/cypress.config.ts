import { defineConfig } from 'cypress';
import { archiveCypress, doCDP, onBeforeBrowserLaunch, finishCDP } from '../src/cypress-api';

export default defineConfig({
  // needed since we use common mock images between Cypress and Playwright
  fixturesFolder: 'fixtures',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        archiveCypress,
        doCDP,
        finishCDP,
      });
      on('before:browser:launch', async (browser, launchOptions) => {
        await onBeforeBrowserLaunch(browser, launchOptions);

        return launchOptions;
      });
    },
  },
});
