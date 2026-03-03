import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    projects: ['packages/shared', 'packages/playwright', 'packages/cypress'],
    exclude: ['**/packages/playwright/tests/**', '**/packages/cypress/tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/test-results/**',
        '**/storybook-static/**',
        '**/dist/**',
        '**/coverage/**',
      ],
    },
  },
});
