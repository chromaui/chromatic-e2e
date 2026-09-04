import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

const fixturesRoot = resolve(import.meta.dirname, "..");

export default defineConfig({
  plugins: [
    /**
     * Mimics `@tailwindcss/vite` without depending on Tailwind: its content scanner
     * registers every scanned project file and its glob patterns via `addWatchFile`
     * while transforming the CSS entry. Vite's `vite:css-analysis` plugin then turns
     * these into file-only module graph entries (`id: null`) on the CSS module.
     */
    {
      name: "fake-tailwind-scanner",
      enforce: "pre",
      transform(_code, id) {
        if (!id.includes("components/styled/styles.css")) {
          return;
        }

        // A scanned non-CSS content file, like `.github/workflows/ci.yml`
        this.addWatchFile(resolve(fixturesRoot, "turbo-snap-1.test.ts"));

        // Scanner glob patterns are registered as watch files too
        this.addWatchFile(resolve(fixturesRoot, "components/**/*.{ts,html}"));

        // Tailwind also registers its CSS build dependencies (`@import`ed
        // stylesheets) as watch files — these are real dependencies
        this.addWatchFile(resolve(fixturesRoot, "css-setup.css"));
      },
    },
  ],
});
