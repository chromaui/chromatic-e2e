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
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'Mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 400, height: 600 },
      },
    },
  ],

  webServer: {
    command: 'yarn run test:server',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
