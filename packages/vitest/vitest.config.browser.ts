import { defineProject } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { chromaticPlugin } from './src/node/plugin';

export default defineProject({
  plugins: [chromaticPlugin()],

  // To always catch errors that happen on first test run
  optimizeDeps: { force: true },

  test: {
    name: { label: 'Vitest Browser', color: 'yellow' },
    include: ['src/**/*.browser.test.ts'],
    setupFiles: ['test/utils/setup.ts'],

    // Isolate project into it's own group as we are running multiple projects with browsers
    sequence: { groupOrder: 3 },
    fileParallelism: false,
    retry: 2,

    browser: {
      enabled: true,
      headless: true,
      screenshotFailures: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },

    provide: {
      processCwd: process.cwd(),
    },
  },
});

declare module 'vitest' {
  export interface ProvidedContext {
    processCwd: string;
  }
}
