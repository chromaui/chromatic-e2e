import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Shared', color: 'cyan' },
    include: ['src/**/*.test.ts'],
  },
});
