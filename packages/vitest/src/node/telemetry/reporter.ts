import { type Vitest } from "vitest/node";
import { type Reporter } from "vitest/reporters";

import { type ResolvedOptions } from "../../types";
import { trackEvent } from "./track";
import { type TelemetryEvent } from "./types";

const REPORTER_NAME = "chromatic-telemetry-reporter";

export class TelemetryReporter implements Reporter {
  public name = REPORTER_NAME;
  private snapshotCount = 0;

  private constructor(
    private ctx: Vitest,
    private options: ResolvedOptions,
  ) {}

  /**
   * Add `TelemetryReporter` to Vitest reporters unless it's already included.
   */
  static apply(ctx: Vitest, options: ResolvedOptions) {
    if (!options.telemetry.enabled) {
      return;
    }

    for (const reporter of ctx.config.reporters) {
      // Apply TelemetryReporter just once
      if (isTelemetryReporter(reporter)) {
        return;
      }
    }

    ctx.config.reporters.push(new TelemetryReporter(ctx, options));
  }

  /**
   * Custom reporter life-cycle called when `takeSnapshot()` is called.
   */
  static onSnapshot(ctx: Vitest, payload: TelemetryEvent<"snapshot_captured">["payload"]) {
    const reporter = ctx.config.reporters.find(isTelemetryReporter);

    reporter?._onSnapshot(payload);
  }

  private _onSnapshot(payload: TelemetryEvent<"snapshot_captured">["payload"]) {
    this.snapshotCount++;

    trackEvent({ eventType: "snapshot_captured", level: "info", payload }, this.ctx, this.options);
  }

  onTestRunStart() {
    this.snapshotCount = 0;

    trackEvent({ eventType: "run_started", level: "info", payload: {} }, this.ctx, this.options);
  }

  onTestRunEnd() {
    trackEvent(
      { eventType: "run_ended", level: "info", payload: { snapshotCount: this.snapshotCount } },
      this.ctx,
      this.options,
    );
  }
}

function isTelemetryReporter(
  reporter: Vitest["config"]["reporters"][number],
): reporter is TelemetryReporter {
  return "name" in reporter && reporter.name === REPORTER_NAME;
}
