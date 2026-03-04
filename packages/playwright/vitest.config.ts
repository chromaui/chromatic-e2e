import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Playwright', color: 'blue' },
    include: ['src/**/*.test.ts'],
  },
});
