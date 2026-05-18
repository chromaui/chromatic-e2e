import { expectTypeOf, test } from 'vitest';

import { takeSnapshot, waitForIdleNetwork, disableAutoSnapshot } from '../dist';
import { chromaticPlugin } from '../dist/plugin';

test('takeSnapshot', () => {
  expectTypeOf(takeSnapshot).toBeFunction();
  expectTypeOf(takeSnapshot).parameter(0).toEqualTypeOf<string | undefined>();
});

test('waitForIdleNetwork', () => {
  expectTypeOf(waitForIdleNetwork).toBeFunction();
  expectTypeOf(waitForIdleNetwork).parameter(0).toEqualTypeOf<number>();
});

test('disableAutoSnapshot', () => {
  expectTypeOf(disableAutoSnapshot).toBeFunction();
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
