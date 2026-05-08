import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "tests/e2e",
  /**
   * One worker: every test recreates the same `e2e-test-workspace` slug via the
   * E2E fixture; parallel tests would collide on that slug.
   */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command:
      "pnpm exec dotenv -e .env.development -- vite --host 127.0.0.1 " +
      "--port 5173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  globalSetup: "./tests/e2e/setup/globalSetup.ts",
  globalTeardown: "./tests/e2e/setup/globalTeardown.ts",
});
