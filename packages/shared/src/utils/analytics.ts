import { Analytics, TrackParams } from '@segment/analytics-node';

const analytics = new Analytics({
  writeKey: process.env.SEGMENT_WRITE_KEY || 'cwWhBWso2gwzyenW29CnCp30Kjz4DogE',
});

// We don't attempt to identify users
const userId = '@chromaui/test-archiver run';

export function track(event: string, properties: TrackParams['properties']) {
  analytics.track({ userId, event, properties });
}

let hasTrackedRun = false;
export function trackRun(properties: TrackParams['properties'] = {}) {
  if (hasTrackedRun) return;
  track('run', properties);
  hasTrackedRun = true; //
}

let hasTrackedComplete = false;
export function trackComplete(properties: TrackParams['properties'] = {}) {
  if (hasTrackedComplete) return;
  track('complete', properties);
  hasTrackedComplete = true;
}
