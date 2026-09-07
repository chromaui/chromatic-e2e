import { defineConfig } from "oxfmt";

export default defineConfig({
  sortImports: true,
  ignorePatterns: ["**/fixtures/corrupt-stats/*.json"],
});
