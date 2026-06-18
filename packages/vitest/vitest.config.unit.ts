import { defineProject } from 'vitest/config';

const isWatch = process.argv.includes('--watch');

export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: { label: 'Vitest Unit', color: 'yellow' },
    include: ['src/**/*.test.ts'],
    exclude: ['**/*.browser.test.ts'],
    setupFiles: ['test/utils/setup.ts'],
    clearMocks: true,

    // Isolate project into it's own group as we are spawning browser runners during tests
    sequence: { groupOrder: 2 },
    fileParallelism: false,
    retry: isWatch ? 0 : 2,

    typecheck: {
      enabled: true,
      include: ['src/*.test-d.ts'],
      ignoreSourceErrors: true,
    },
  },
});
