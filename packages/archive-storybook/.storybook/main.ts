import path from "node:path";

import type { StorybookConfigVite } from "@storybook/builder-vite";
import type { StorybookConfig } from "storybook/internal/types";
import { mergeConfig } from "vite";

import { storiesPlugin } from "../src/stories-plugin.ts";

const config: StorybookConfig & StorybookConfigVite = {
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
  viteFinal: (config) =>
    mergeConfig(config, {
      // TODO: Use builder option `experimental_importFn` instead once updated to storybook@11, see https://github.com/storybookjs/storybook/pull/37148
      plugins: [storiesPlugin()],
      resolve: {
        alias: [
          {
            find: /^@chromatic-com\/shared-e2e/,
            replacement: path.resolve(import.meta.dirname, "../../shared/src"),
          },
        ],
      },
    }),
};

export default config;
