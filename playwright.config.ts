import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__playwright-tests__',
  use: { baseURL: 'http://localhost:3000' },

  webServer: {
    command: 'yarn test:server',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
