import { defineConfig } from "vitest/config";

/**
 * Shared Vitest base. Each package extends this via `mergeConfig` in its own
 * vitest.config.ts, so Turborepo can run `test` per package and cache results
 * independently.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [new URL("./vitest.setup.ts", import.meta.url).pathname],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["**/dist/**", "**/*.config.*", "**/*.d.ts"],
    },
  },
});
