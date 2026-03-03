import { defineProject } from 'vitest/config';
import { resolve } from 'path';

export default defineProject({
  test: {
    name: {
      label: 'playwright',
      color: 'blue',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/__playwrightTests__/**', 'tests/**', '**/*.spec.{ts,tsx}'],
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
  resolve: {
    alias: {
      // playwright-core 1.58+ mcpBundle fails in Node; stub so unit tests run.
      '../../mcpBundle': resolve(__dirname, '__mocks__/mcpBundle.js'),
    },
  },
});
