import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: { label: "Archive Storybook", color: "magenta" },
    include: ["src/**/*.test.ts"],
  },
});
