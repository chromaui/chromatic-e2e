export interface ChromaticConfig {
  delay?: number;
  diffIncludeAntiAliasing?: boolean;
  diffThreshold?: number;
  disableAutoCapture?: boolean;
  forcedColors?: string;
  pauseAnimationAtEnd?: boolean;
  prefersReducedMotion?: string;
}

export interface ChromaticStorybookParameters extends Omit<ChromaticConfig, 'disableAutoCapture'> {
  viewports: number[];
}
