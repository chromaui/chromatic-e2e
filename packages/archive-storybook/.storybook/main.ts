import type { StorybookConfig } from "storybook/internal/types";

const config: StorybookConfig = {
  // Storybook requires a value here, even if it didn't match any stories
  stories: ["do-not-match-anything"],

  core: {
    builder: import.meta.resolve("@storybook/builder-vite"),
    renderer: import.meta.resolve("@storybook/server/preset"),
    disableTelemetry: true,
  },
  features: {
    sidebarOnboardingChecklist: false,
  },
};

export default config;
