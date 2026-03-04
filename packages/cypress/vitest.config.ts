import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Cypress', color: 'green' },
    include: ['src/**/*.test.ts'],
  },
});
