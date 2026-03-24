import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: { label: 'Vitest Unit', color: 'yellow' },
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.browser.test.ts'],
    setupFiles: ['test/utils/setup.ts'],
    mockReset: true,

    // Isolate project into it's own group as we are spawning browser runners during tests
    sequence: { groupOrder: 2 },
    fileParallelism: false,
    retry: 2,
  },
});
