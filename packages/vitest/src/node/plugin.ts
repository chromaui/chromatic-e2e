import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type {} from 'vitest/config';
import type { Vite } from 'vitest/node';
import colors from 'tinyrainbow';
import { createCommands } from './commands';
import { DEFAULT_OUTPUT_DIR } from '../constants';
import { type ResolvedOptions, type Options } from '../types';

/**
 * Vitest plugin for integrating with Chromatic's visual regression testing.
 */
export function chromaticPlugin(userOptions: Options = {}): Vite.Plugin {
  const options: ResolvedOptions = {
    assetDomains: [],
    outputDirectory: DEFAULT_OUTPUT_DIR,
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
