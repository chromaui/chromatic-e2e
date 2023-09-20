export interface ChromaticConfig {
  chromatic: ChromaticParameters;
}

export interface ChromaticParameters {
  diffIncludeAntiAliasing?: boolean;
  diffThreshold?: number;
  disableE2EAutoCapture?: boolean;
  pauseAnimationAtEnd?: boolean;
}

export interface ChromaticStorybookParameters extends ChromaticParameters {
  viewports: number[];
}
