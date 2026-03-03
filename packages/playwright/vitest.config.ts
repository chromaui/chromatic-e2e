import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      '**/__playwrightTests__/**',
      'tests/**',
      '**/*.spec.{ts,tsx}',
    ],
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/test-results/**', '**/node_modules/**'],
    },
    setupFiles: [resolve(__dirname, 'vitest.setup.ts')],
  },
  resolve: {
    alias: {
      // playwright-core 1.58+ mcpBundle fails in Node; stub so unit tests run.
      '../../mcpBundle': resolve(__dirname, '__mocks__/mcpBundle.js'),
    },
  },
});
