import { commands } from 'vitest/browser';
import { inject } from 'vitest';
import type {} from '../node/commands';
import type { EventType, TelemetryEvent } from '../node/telemetry/types';

/**
 * Forward a telemetry event to the Node process, where metadata and other automatically
 * generated fields are attached and opt-out settings are applied. Fire-and-forget; never throws.
 *
 * @internal
 */
export function trackEvent<T extends EventType = EventType>(event: TelemetryEvent<T>): void {
  const enabled = inject('__chromatic_options')?.telemetry.enabled ?? false;

  if (enabled) {
    void commands.__chromatic_telemetry(event).catch(() => {});
  }
}
