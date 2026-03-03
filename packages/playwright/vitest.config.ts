import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: {
      label: 'playwright',
      color: 'blue',
    },
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['**/__playwrightTests__/**', 'tests/**', '**/*.spec.{ts,tsx}'],
  },
});
