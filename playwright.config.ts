import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * Deliberately NOT wired into `turbo test`: these need PostgreSQL, the API,
 * and four dev servers running. Vitest suites must stay runnable anywhere,
 * with no infrastructure — see docs/00-status.md.
 *
 * Run with: bun run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  /* Sessions are shared state; parallel logins would interfere. */
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:9000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
