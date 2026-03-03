import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: {
      label: 'cypress',
      color: 'green',
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
