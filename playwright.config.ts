import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { SHORT_WAIT } from "./tests/e2e/helpers/timeouts";
import { ensureE2eViteFeatureFlags } from "./tests/e2e/setup/ensureE2eViteFeatureFlags";

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
ensureE2eViteFeatureFlags();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const isCI = !!process.env.CI;

/**
 * Per-test ceiling:
 * - 45s locally so failures surface quickly
 * - 90s in CI for noisier infra
 */
const defaultTestTimeoutMs = isCI ? 90_000 : 45_000;

export default defineConfig({
  testDir: "tests/e2e",
  /**
   * Default `workers: 1`; raising it is safe: each worker gets its own
   * `e2e-test-workspace-w{n}` slug via the worker-scoped `e2eWorkerDb` fixture.
   */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: defaultTestTimeoutMs,
  expect: { timeout: SHORT_WAIT },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5173",
    env: process.env as Record<string, string>,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  globalSetup: "./tests/e2e/setup/globalSetup.ts",
  globalTeardown: "./tests/e2e/setup/globalTeardown.ts",
});
