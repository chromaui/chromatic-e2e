import { defineProject } from 'vitest/config';
import { version as vitestVersion } from 'vitest/node';

const isWatch = process.argv.includes('--watch');

export default defineProject({
  resolve: { tsconfigPaths: true },
  publicDir: 'test/fixtures/public-dir',
  plugins: [
    {
      name: 'hack',
      enforce: 'pre',
      resolveId(id) {
        // vitest/suite is available in 4.0 only. Importing it in 4.1 logs error, in 5.0 it's removed.
        if (id === 'vitest/suite' && !vitestVersion.startsWith('4.0')) {
          return 'vitest';
        }
      },
    },
  ],
  test: {
    name: { label: 'Vitest Unit', color: 'yellow' },
    include: ['src/**/*.test.ts', 'embedded.test.ts'],
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
