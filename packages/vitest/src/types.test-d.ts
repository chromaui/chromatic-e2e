import { expectTypeOf, test } from 'vitest';

import { takeSnapshot, waitForIdleNetwork, configure } from '../dist';
import { chromaticPlugin } from '../dist/plugin';

test('takeSnapshot', () => {
  expectTypeOf(takeSnapshot).toBeFunction();
  expectTypeOf(takeSnapshot).parameter(0).toEqualTypeOf<string | undefined>();
});

test('waitForIdleNetwork', () => {
  expectTypeOf(waitForIdleNetwork).toBeFunction();
  expectTypeOf(waitForIdleNetwork).parameter(0).toEqualTypeOf<number>();
});

test('configure', () => {
  expectTypeOf(configure).toBeFunction();

  expectTypeOf(configure).parameter(0).toHaveProperty('delay');
  expectTypeOf(configure).parameter(0).toHaveProperty('diffIncludeAntiAliasing');
  expectTypeOf(configure).parameter(0).toHaveProperty('diffThreshold');
  expectTypeOf(configure).parameter(0).toHaveProperty('disableAutoSnapshot');
  expectTypeOf(configure).parameter(0).toHaveProperty('forcedColors');
  expectTypeOf(configure).parameter(0).toHaveProperty('pauseAnimationAtEnd');
  expectTypeOf(configure).parameter(0).toHaveProperty('prefersReducedMotion');
  expectTypeOf(configure).parameter(0).toHaveProperty('resourceArchiveTimeout');
  expectTypeOf(configure).parameter(0).toHaveProperty('cropToViewport');
  expectTypeOf(configure).parameter(0).toHaveProperty('ignoreSelectors');

  // Options that are only available globally in plugin options
  expectTypeOf(configure).parameter(0).not.toHaveProperty('assetDomains');
  expectTypeOf(configure).parameter(0).not.toHaveProperty('tags');
  expectTypeOf(configure).parameter(0).not.toHaveProperty('outputDirectory');
  expectTypeOf(configure).parameter(0).not.toHaveProperty('idleNetworkInterval');
});

test('chromaticPlugin', () => {
  expectTypeOf(chromaticPlugin).toBeFunction();

  expectTypeOf(chromaticPlugin).parameter(0).not.toHaveProperty('somethingThatDoesNotExist');

  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('tags');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('outputDirectory');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('idleNetworkInterval');

  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('delay');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('diffIncludeAntiAliasing');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('diffThreshold');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('disableAutoSnapshot');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('forcedColors');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('pauseAnimationAtEnd');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('prefersReducedMotion');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('resourceArchiveTimeout');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('assetDomains');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('cropToViewport');
  expectTypeOf(chromaticPlugin).parameter(0).toHaveProperty('ignoreSelectors');
});
