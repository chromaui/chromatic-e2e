export interface ChromaticConfig {
  // https://www.chromatic.com/docs/delay/
  delay?: number;

  // https://www.chromatic.com/docs/threshold/#anti-aliasing
  diffIncludeAntiAliasing?: boolean;

  // https://www.chromatic.com/docs/threshold/#setting-the-threshold
  diffThreshold?: number;

  // Disable the capture that happens automatically at the end of a test when using the Chromatic test fixture
  disableAutoCapture?: boolean;

  // https://www.chromatic.com/docs/media-features/#test-high-contrast-color-schemes
  forcedColors?: string;

  // https://www.chromatic.com/docs/animations/#css-animations
  pauseAnimationAtEnd?: boolean;

  // https://www.chromatic.com/docs/media-features/#verify-reduced-motion-animations
  prefersReducedMotion?: string;

  // Specify a network timeout, in milliseconds. This is the maximum amount of time that
  // each test will wait for the network to be idle.
  networkTimeout?: number;
}

export interface ChromaticStorybookParameters extends Omit<ChromaticConfig, 'disableAutoCapture'> {
  viewports: number[];
}
