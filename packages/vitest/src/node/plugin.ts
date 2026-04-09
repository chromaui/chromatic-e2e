import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type {} from 'vitest/config';
import type { Vite } from 'vitest/node';
import colors from 'tinyrainbow';
import { DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS } from '@chromatic-com/shared-e2e';
import { createCommands } from './commands';
import { DEFAULT_OUTPUT_DIR } from '../constants';
import { type ResolvedOptions, type Options } from '../types';

const DEFAULT_TAG_DESCRIPTION = 'Visual Regression Tests for `@chromatic-com/vitest`';

/**
 * Vitest plugin for integrating with Chromatic's visual regression testing.
 */
export function chromaticPlugin(userOptions: Options = {}): Vite.Plugin {
  const options: ResolvedOptions = {
    assetDomains: [],
    disableAutoSnapshot: false,
    outputDirectory: DEFAULT_OUTPUT_DIR,
    resourceArchiveTimeout: DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS,
    idleNetworkInterval: 100,
    ...userOptions,
  };

  return {
    name: 'vitest:chromatic',
    config() {
      const isDist = import.meta.url.includes('dist/plugin.js');
      const setupFile = resolve(
        import.meta.dirname,
        isDist ? './setupFile.js' : '../browser/setupFile.ts'
      );

      return {
        test: {
          setupFiles: [setupFile],
          browser: {
            commands: createCommands(options),
          },
        },
      };
    },

    configureVitest(context) {
      const project = context.project;
      const resolvedTags = project.config.tags || [];

      // We support Vitest 4.0.0, but tags were introduced in 4.1.0
      if (options.tags && context.vitest.version.startsWith('4.0')) {
        context.vitest.logger.warn(
          colors.bgYellow(colors.black(' chromatic ')),
          colors.yellow(
            `Tags cannot be used with Vitest ${context.vitest.version}. Please upgrade to Vitest 4.1 or later to use this feature.`
          )
        );
      }

      for (const tag of options.tags || []) {
        const exists = resolvedTags.find((userTag) => userTag.name === tag);

        if (!exists) {
          resolvedTags.push({ name: tag, description: DEFAULT_TAG_DESCRIPTION });
        }
      }

      clean();

      if (!project.config.browser.enabled) {
        context.vitest.logger.warn(
          colors.bgYellow(colors.black(' chromatic ')),
          colors.yellow('Plugin is used in a non-browser context.')
        );
      }

      project.onTestsRerun(async () => {
        clean();
        await project.browser?.triggerCommand('__chromatic_reset', {} as any);
      });

      function clean() {
        rmSync(resolve(project.config.root, options.outputDirectory, 'chromatic-archives'), {
          recursive: true,
          force: true,
        });
      }
    },
  };
}
