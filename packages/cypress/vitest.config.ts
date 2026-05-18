import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Cypress', color: 'green' },
    include: ['src/**/*.test.ts'],
    typecheck: {
      enabled: true,
      include: ['src/*.test-d.ts'],
      ignoreSourceErrors: true,
    },
  },
});
