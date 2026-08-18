import { existsSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import type {} from 'vitest/config';
import type { Vite } from 'vitest/node';
import colors from 'tinyrainbow';
import { DEFAULT_GLOBAL_RESOURCE_ARCHIVE_TIMEOUT_MS } from '@chromatic-com/shared-e2e';
import { createCommands } from './commands';
import {
  cleanTelemetryLogFiles,
  resolveTelemetryOptions,
  setupTelemetryCleanup,
  trackEvent as _trackEvent,
  type EventType,
  type TelemetryEvent,
} from './telemetry';
import { ChromaticReporter } from './reporter';
import { TelemetryReporter } from './telemetry';
import { mergePreviewStats, WebpackStatsReporter } from './webpack-stats-reporter';
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
    turboSnap: false,
    ...userOptions,
    reporter: resolveReporterOptions(userOptions.reporter),
    telemetry: resolveTelemetryOptions(),
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
          provide: {
            __chromatic_options: options,
          },
          browser: {
            commands: createCommands(options),
          },
        },
      };
    },

    configureVitest: withErrorTracking(options, async (context) => {
      const project = context.project;
      const browser = project.config.browser;
      const sequence = context.vitest.config.sequence;

      // Enabled when "vitest --merge-reports" is run. It's used after sharded runs ("vitest --shard=1/2", "vitest --shard=2/2").
      const isMergeReports = project.globalConfig.mergeReports;

      if (options.telemetry.enabled) {
        setupTelemetryCleanup(context.vitest);

        trackEvent({
          eventType: 'plugin_configured',
          level: 'info',
          payload: {
            isShardedRun: project.config.shard != null,
            cropToViewport: options.cropToViewport,
            delay: options.delay,
            diffIncludeAntiAliasing: options.diffIncludeAntiAliasing,
            diffThreshold: options.diffThreshold,
            disableAutoSnapshot: options.disableAutoSnapshot,
            forcedColors: options.forcedColors,
            idleNetworkInterval: options.idleNetworkInterval,
            pauseAnimationAtEnd: options.pauseAnimationAtEnd,
            prefersReducedMotion: options.prefersReducedMotion,
            resourceArchiveTimeout: options.resourceArchiveTimeout,
            turboSnap: options.turboSnap,
            reporter: !options.reporter.enabled
              ? 'off'
              : options.reporter.verbose
                ? 'verbose'
                : 'non-verbose',

            // Don't attach any user-defined strings values:
            isCustomOutputDirectory: options.outputDirectory !== DEFAULT_OUTPUT_DIR,
            assetDomainsCount: options.assetDomains?.length ?? 0,
            ignoreSelectorsCount: options.ignoreSelectors?.length ?? 0,
            tagsCount: options.tags?.length ?? 0,
          },
        });
      }

      // browser.name is instances[].browser, not instances[].name: https://github.com/vitest-dev/vitest/blob/d22b029ae056b9515033d75c1249e9db26612770/packages/vitest/src/node/projects/resolveProjects.ts#L307
      if (!browser.enabled || browser.name !== 'chromium') {
        trackEvent({
          eventType: 'project_ineligible',
          level: 'warn',
          payload: { isBrowser: browser.enabled, isChromium: browser.name === 'chromium' },
        });

        return clean();
      }

      if (options.reporter.enabled) {
        ChromaticReporter.apply(context.vitest, options);
      }

      if (options.turboSnap && !isMergeReports) {
        WebpackStatsReporter.apply(context.vitest, options);
      }

      if (options.telemetry.enabled) {
        TelemetryReporter.apply(context.vitest, options);
      }

      // Ensure our setup file is registered first so that afterEach runs before any user-defined hooks.
      if (sequence.hooks === 'stack') {
        project.config.setupFiles.push(setupFile);
      } else if (sequence.hooks === 'list') {
        project.config.setupFiles.unshift(setupFile);
      } else {
        trackEvent({
          eventType: 'setup_files_parallel',
          level: 'warn',
          payload: { setupFileCount: project.config.setupFiles.length },
        });

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

        trackEvent({ eventType: 'tags_low_version', level: 'warn', payload: {} });
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

      if (isMergeReports) {
        if (options.turboSnap) {
          try {
            await mergePreviewStats({
              root: project.vitest.config.root,
              outputDirectory: options.outputDirectory,
            });
          } catch (error) {
            trackEvent({
              eventType: 'turbosnap_error',
              level: 'error',
              payload: { operation: 'merge-stats', error },
            });

            throw error;
          }
        }
      } else {
        clean();
      }

      project.onTestsRerun(async () => {
        clean();
        await project.browser?.triggerCommand('__chromatic_reset', {} as any);
      });

      function clean() {
        const outputDirectory = resolve(project.vitest.config.root, options.outputDirectory);

        rmSync(resolve(outputDirectory, 'chromatic-archives'), { recursive: true, force: true });
        cleanTelemetryLogFiles(outputDirectory);

        if (existsSync(outputDirectory)) {
          for (const file of readdirSync(outputDirectory)) {
            if (file.startsWith('preview-stats') && file.endsWith('.json')) {
              rmSync(resolve(outputDirectory, file), { force: true });
            }
          }
        }
      }

      function trackEvent<T extends EventType = EventType>(event: TelemetryEvent<T>): void {
        _trackEvent(event, context.vitest, options);
      }
    }),
  };
}

function withErrorTracking(
  options: ResolvedOptions,
  configureVitest: Vite.Plugin['configureVitest']
): Vite.Plugin['configureVitest'] {
  return async (context) => {
    try {
      return await configureVitest(context);
    } catch (error) {
      _trackEvent(
        { eventType: 'plugin_error', level: 'error', payload: { operation: 'configure', error } },
        context.vitest,
        options
      );

      throw error;
    }
  };
}

function resolveReporterOptions(reporter: Options['reporter']): ResolvedOptions['reporter'] {
  if (reporter == undefined || reporter === true) {
    return { enabled: true, verbose: true };
  }

  if (reporter === false) {
    return { enabled: false, verbose: false };
  }

  return {
    enabled: reporter.enabled ?? true,
    verbose: reporter.verbose ?? true,
  };
}

/** @internal */
declare module 'vitest' {
  export interface ProvidedContext {
    __chromatic_options: ResolvedOptions;
  }
}
