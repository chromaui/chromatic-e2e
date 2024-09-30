export interface ChromaticConfig {
  // https://www.chromatic.com/docs/delay/
  delay?: number;

  // https://www.chromatic.com/docs/threshold/#anti-aliasing
  diffIncludeAntiAliasing?: boolean;

  // https://www.chromatic.com/docs/threshold/#setting-the-threshold
  diffThreshold?: number;

  // Disable the capture that happens automatically at the end of a test when using the Chromatic test fixture
  disableAutoSnapshot?: boolean;

  // https://www.chromatic.com/docs/media-features/#test-high-contrast-color-schemes
  forcedColors?: string;

  // https://www.chromatic.com/docs/animations/#css-animations
  pauseAnimationAtEnd?: boolean;

  // https://www.chromatic.com/docs/media-features/#verify-reduced-motion-animations
  prefersReducedMotion?: string;

  // Specify a network timeout, in milliseconds. This is the maximum amount of time that
  // each test will wait for the network to be idle while archiving resources.
  resourceArchiveTimeout?: number;

  // domains (besides where the test is being run from) that assets should be archived from
  // (needed when, for example, CI environment can't access the archives later on)
  // ex: www.some-domain.com
  assetDomains?: string[];

  // Crop snapshots to the viewport size.
  cropToViewport?: boolean;

  // CSS selectors of elements to ignore when comparing snapshots.
  ignoreSelectors?: string[];
}

export type ChromaticStorybookParameters = Omit<ChromaticConfig, 'disableAutoSnapshot'>;
