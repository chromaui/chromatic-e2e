import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'Desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'Mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],

  webServer: {
    command: 'yarn run test:server',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
