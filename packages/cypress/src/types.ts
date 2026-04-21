import type { serializedNodeWithId } from '@rrweb/types';
import type { Viewport } from '@chromatic-com/shared-e2e';

export interface CypressSnapshot {
  // the name of the snapshot (optionally provided for manual snapshots, never provided for automatic snapshots)
  name?: string;
  // the DOM snapshot
  snapshot: serializedNodeWithId;
  // the viewport at the time of the snapshot
  viewport: Viewport;
}
