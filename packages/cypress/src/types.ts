import type { serializedNodeWithId } from '@rrweb/types';
import type { DOMSnapshots } from '@chromatic-com/shared-e2e';

export interface CypressSnapshot {
  // the name of the snapshot (optionally provided for manual snapshots, never provided for automatic snapshots)
  name?: string;
  // the DOM snapshot
  snapshot: serializedNodeWithId;
  viewport: DOMSnapshots[string]['viewport'];
  pseudoClassIds: DOMSnapshots[string]['pseudoClassIds'];
}
