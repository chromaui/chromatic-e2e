import path from "node:path";

import type { StorybookConfig } from "storybook/internal/types";

const config: StorybookConfig = {
  // Storybook requires a value here, even if it didn't match any stories
  stories: ["do-not-match-anything"],

  framework: {
    name: path.resolve(import.meta.dirname, "../framework"),
    options: {},
  },
  core: {
    disableTelemetry: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
};

export default config;
