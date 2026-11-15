import { defineConfig } from "@playwright/test";

/**
 * Producer-only headless gallery checks run one spec and one worker at a time.
 */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: [
    "motion-content.spec.ts",
    "motion-navigation.spec.ts",
    "composition-appearance.spec.ts",
  ],
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4183",
    headless: true,
    acceptDownloads: true,
    viewport: {
      width: 1440,
      height: 1000,
    },
    reducedMotion: "reduce",
    trace: "off",
    screenshot: "only-on-failure",
  },
});
