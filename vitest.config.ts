import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/shared', 'packages/playwright', 'packages/cypress'],

    coverage: {
      provider: 'v8',
    },
  },
});
