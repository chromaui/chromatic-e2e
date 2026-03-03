import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: {
      label: 'shared',
      color: 'yellow',
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
