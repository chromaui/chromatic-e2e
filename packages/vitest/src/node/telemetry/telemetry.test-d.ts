import { describe, test } from "vitest";

import { trackEvent } from "./index";

// These should rather use "expectTypeOf" instead of "@ts-expect-error", but expect-type is really difficult to use.

describe("trackEvent payload is narrowed by event type", () => {
  const vitest: any = {};
  const resolvedOptions: any = {};

  test("accepts expected payload", () => {
    trackEvent(
      {
        eventType: "project_ineligible",
        level: "info",
        payload: { isBrowser: true, isChromium: true },
      },
      vitest,
      resolvedOptions,
    );
  });

  test("does not accept wrong types in payload", () => {
    trackEvent(
      {
        eventType: "project_ineligible",
        level: "info",
        payload: {
          // @ts-expect-error -- should be boolean
          isBrowser: 123,

          // @ts-expect-error -- should be boolean
          isChromium: 123,
        },
      },
      vitest,
      resolvedOptions,
    );
  });

  test("does not accept extra fields in payload", () => {
    trackEvent(
      {
        eventType: "project_ineligible",
        level: "info",
        payload: {
          // @ts-expect-error -- non-existing field
          doesNotExist: true,
        },
      },
      vitest,
      resolvedOptions,
    );
  });

  test("does not allow payloads of other events", () => {
    trackEvent(
      {
        eventType: "project_ineligible",
        level: "info",
        payload: {
          // @ts-expect-error -- payload of plugin_configured event
          disableAutoSnapshot: true,
        },
      },
      vitest,
      resolvedOptions,
    );
  });
});
