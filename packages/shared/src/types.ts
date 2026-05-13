import { NodeType, serializedNodeWithId } from '@rrweb/types';
import { Viewport } from './utils/viewport';

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

export type DOMSnapshots = Record<
  string,
  {
    /** Buffer of stringified rrweb-snapshot `serializedNodeWithId` JSON */
    snapshot: Buffer;

    /** Viewport dimensions from the exact time the snapshot was taken */
    viewport: Viewport;

    /** Mapping of pseudo-class names to their corresponding rrweb-snapshot element IDs */
    pseudoClassIds: Partial<
      Record<':active' | ':focus' | ':focus-visible' | ':hover', serializedNodeWithId['id'][]>
    >;
  }
>;

/** Shape of the snapshot that is written to **the file system** */
export interface SavedSnapshot {
  snapshot: serializedNodeWithId;
  pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'];
}

export type SerializedIframeNode = serializedNodeWithId & {
  type: NodeType.Element;
  tagName: 'iframe';
  contentDocument?: serializedNodeWithId;
  pseudoClassIds?: DOMSnapshots[string]['pseudoClassIds'];
};
