import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: { label: 'Cypress', color: 'green' },
    include: ['src/**/*.test.ts', 'embedded.test.ts'],
    typecheck: {
      enabled: true,
      include: ['src/*.test-d.ts'],
      ignoreSourceErrors: true,
    },
  },
});
