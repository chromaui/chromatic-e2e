import type { serializedNodeWithId } from '@rrweb/types';

export interface CypressSnapshot {
  // the name of the snapshot (optionally provided for manual snapshots, never provided for automatic snapshots)
  name?: string;
  // the DOM snapshot
  snapshot: serializedNodeWithId;
}
