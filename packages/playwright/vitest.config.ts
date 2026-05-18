import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Playwright', color: 'blue' },
    include: ['src/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['src/*.test-d.ts'],
      ignoreSourceErrors: true,
    },
  },
});
