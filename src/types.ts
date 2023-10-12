export interface ChromaticConfig {
  chromatic: ChromaticParameters;
}

export interface ChromaticParameters {
  diffIncludeAntiAliasing?: boolean;
  diffThreshold?: number;
  disableAutoCapture?: boolean;
  pauseAnimationAtEnd?: boolean;
}

export interface ChromaticStorybookParameters extends ChromaticParameters {
  viewports: number[];
}
