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
    snapshotsAsModes: false,
    ...userOptions,
  };

  const isDist = import.meta.url.includes('dist/plugin.js');

  const setupFile = resolve(
    import.meta.dirname,
    isDist ? './setupFile.js' : '../browser/setupFile.ts'
  );

  return {
    name: 'vitest:chromatic',
    config() {
      return {
        optimizeDeps: {
          entries: [setupFile],
        },
        test: {
          browser: {
            commands: createCommands(options),
          },
        },
      };
    },

    configureVitest(context) {
      const project = context.project;
      const sequence = context.vitest.config.sequence;

      if (!project.config.browser.enabled) {
        return;
      }

      // Ensure our setup file is registered first so that afterEach runs before any user-defined hooks.
      if (sequence.hooks === 'stack') {
        project.config.setupFiles.push(setupFile);
      } else if (sequence.hooks === 'list') {
        project.config.setupFiles.unshift(setupFile);
      } else {
        project.config.setupFiles.push(setupFile);

        context.vitest.logger.warn(
          colors.bgYellow(colors.black(' chromatic ')),
          colors.yellow(
            `Using { sequence.hooks: 'parallel' } may cause unstable snapshots. Please set 'sequence.hooks' to 'list' or 'stack' to ensure reliable snapshot ordering.`
          )
        );
      }

      // We support Vitest 4.0.0, but tags were introduced in 4.1.0
      if (options.tags && context.vitest.version.startsWith('4.0')) {
        context.vitest.logger.warn(
          colors.bgYellow(colors.black(' chromatic ')),
          colors.yellow(
            `Tags cannot be used with Vitest ${context.vitest.version}. Please upgrade to Vitest 4.1 or later to use this feature.`
          )
        );
      }

      if (options.tags) {
        project.config.tags ||= [];

        for (const tag of options.tags) {
          const exists = project.config.tags.find((userTag) => userTag.name === tag);

          if (!exists) {
            project.config.tags.push({ name: tag, description: DEFAULT_TAG_DESCRIPTION });
          }
        }
      }

      if (!project.globalConfig.mergeReports) {
        clean();
      }

      project.onTestsRerun(async () => {
        clean();
        await project.browser?.triggerCommand('__chromatic_reset', {} as any);
      });

      function clean() {
        rmSync(resolve(project.vitest.config.root, options.outputDirectory, 'chromatic-archives'), {
          recursive: true,
          force: true,
        });
      }
    },
  };
}
