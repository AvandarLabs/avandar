import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { SHORT_WAIT } from "./tests/e2e/helpers/timeouts";
import {
  ensureE2EViteFeatureFlags,
  shouldReuseE2EViteServer,
} from "./tests/e2e/setup/ensureE2EViteFeatureFlags";

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
ensureE2EViteFeatureFlags();

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const isCI = !!process.env.CI;

/**
 * Ensures e2e runs with flags required by share-modal and shared-with-me specs.
 * Merges with any flags already present in `.env.development`.
 */
function mergeE2EFeatureFlags(): string {
  const existing = (process.env.VITE_FEATURE_FLAGS ?? "")
    .split(",")
    .map((part) => {
      return part.trim();
    })
    .filter(Boolean);
  return [...new Set([...existing, "enable-shared-with-me"])].join(",");
}

const e2eFeatureFlags = mergeE2EFeatureFlags();

/**
 * Per-test ceiling:
 * - 45s locally so failures surface quickly
 * - 90s in CI for noisier infra
 */
const defaultTestTimeoutMs = isCI ? 90_000 : 45_000;

export default defineConfig({
  testDir: "tests/e2e",

  // Default `workers: 1`; raising it is safe: each worker gets its own
  // `e2e-test-workspace-w{n}` slug via the worker-scoped `e2eWorkerDb` fixture.
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

    // Sets `prefers-reduced-motion: reduce` on every page. The codebase's
    // animation CSS (see `src/config/Theme/animationPresets.css`) collapses
    // ooze-in/swipe-out to 120ms opacity fades with no position transforms
    // under this media query, and Mantine transitions honor it too. This
    // removes whole classes of geometry/timing races (panel `boundingBox`
    // mid-morph, modal-open transitions, etc.) without changing product code.
    contextOptions: { reducedMotion: "reduce" },
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 5173",
    env: {
      ...(process.env as Record<string, string>),
      VITE_FEATURE_FLAGS: e2eFeatureFlags,
    },
    url: baseURL,
    reuseExistingServer: shouldReuseE2EViteServer(isCI),
    timeout: 180_000,
  },
  globalSetup: "./tests/e2e/setup/globalSetup.ts",
  globalTeardown: "./tests/e2e/setup/globalTeardown.ts",
});
