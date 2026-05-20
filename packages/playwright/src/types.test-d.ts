import { expectTypeOf, test } from 'vitest';
import { Page, TestInfo } from '@playwright/test';

import * as publicAPI from '../dist';

test('test.use() chromatic options', () => {
  expectTypeOf(publicAPI.test.use).parameter(0).not.toHaveProperty('somethingThatDoesNotExist');

  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('delay');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('diffIncludeAntiAliasing');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('diffThreshold');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('disableAutoSnapshot');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('forcedColors');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('pauseAnimationAtEnd');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('prefersReducedMotion');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('resourceArchiveTimeout');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('assetDomains');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('cropToViewport');
  expectTypeOf(publicAPI.test.use).parameter(0).toHaveProperty('ignoreSelectors');
});

test('takeSnapshot', () => {
  expectTypeOf(publicAPI.takeSnapshot).toBeFunction();

  expectTypeOf(publicAPI.takeSnapshot).parameters.toEqualTypeOf<
    [Page, TestInfo] | [Page, string, TestInfo]
  >();
});
