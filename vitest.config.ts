import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      enabled: true,
    },
    projects: ['./packages/*/vitest.config.*'],

    onConsoleLog(log, type, entity) {
      if (
        log.startsWith('Chromatic archives directory cannot be found') &&
        entity.type === 'test' &&
        entity.name === 'archive-storybook called with directory without chromatic-archives'
      ) {
        return false;
      }

      if (log.startsWith('Example error') && entity.type === 'test') {
        return false;
      }
    },
  },
});
