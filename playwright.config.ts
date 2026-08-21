import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { SHORT_WAIT } from "./tests/e2e/helpers/timeouts";
import { E2EPreflight } from "./tests/e2e/setup/E2EPreflight";
import {
  E2E_ONLINE_TAG,
  ensureE2EViteFeatureFlags,
  isE2EOfflineMode,
} from "./tests/e2e/setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";

dotenv.config({ path: path.resolve(process.cwd(), ".env.development") });
ensureE2EViteFeatureFlags();

// `ava supabase switch` pins AVA_VITE_DEV_PORT in `.env.development`, so a
// switched worktree serves the app somewhere other than the standard port.
const devServerPort = process.env.AVA_VITE_DEV_PORT || "5173";
const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${devServerPort}`;
const parsedBaseUrl = new URL(baseUrl);
const vitePort =
  parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");
const isCI = !!process.env.CI;

// The app servers below are started for this run, but Supabase is not, so it
// is the one thing that has to already be up.
const supabaseUrl =
  process.env.VITE_SUPABASE_API_URL ??
  process.env.SUPABASE_URL ??
  "http://127.0.0.1:54321";

// Both checks run here, while the config is still evaluating, because this is
// the last moment before Playwright starts `webServer`: from `globalSetup` the
// run's own Vite is already on the port and every run would fail.
E2EPreflight.assertDevServerPortIsFree({
  host: parsedBaseUrl.hostname,
  port: Number(vitePort),
});
E2EPreflight.assertSupabaseApiIsRunning(`${supabaseUrl}/rest/v1/`);

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
  testMatch: "**/*.spec.ts",

  // Stays at one worker, which `docs/rules/e2e-testing.md` treats as a given:
  // the `freshBrowserPage` fixture exists to give a spec a cold process
  // precisely because every other spec shares this worker's aging one, and the
  // rule that heavy cold-render routes keep the shared `page` reads from the
  // same premise. Raising it was measured and did not hold: at three workers
  // `gis-geometry-crs` times out reproducibly while passing solo in 17s, and
  // at two `gis-geometry-column` fails its post-reload assertion in most
  // full-suite runs, again passing solo. Both are GIS specs driving MapLibre
  // and a DuckDB-WASM worker, which a second concurrent browser starves.
  //
  // Raising this also needs work beyond the number. The two accounts in
  // `e2e-credentials.ts` are shared by every worker, and `e2eWorkerDb`'s
  // teardown deletes them and sweeps the `e2e-org-%` workspaces they own, both
  // scoped by user rather than by the per-worker slug. Concurrent workers would
  // therefore delete each other's user mid-test.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: defaultTestTimeoutMs,
  expect: { timeout: SHORT_WAIT },
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",

    // Sets `prefers-reduced-motion: reduce` on every page. The codebase's
    // animation CSS (see `src/config/Theme/animationPresets.css`) collapses
    // ooze-in/swipe-out/pop-in to 120ms opacity fades with no position
    // transforms under this media query, and Mantine transitions honor it too.
    // This removes whole classes of geometry/timing races (panel
    // `boundingBox` mid-morph, modal-open transitions, etc.) without changing
    // product code.
    contextOptions: { reducedMotion: "reduce" },
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: `pnpm exec vite --host ${parsedBaseUrl.hostname} --port ${vitePort}`,
      env: {
        ...(process.env as Record<string, string>),
        VITE_FEATURE_FLAGS: e2eFeatureFlags,
      },
      url: baseUrl,
      // Never reuse. This server carries `enable-shared-with-me` and
      // `VITE_OFFLINE_CHAT_MOCK=true`, which no `pnpm dev` server is ever
      // started with, so an existing one is configured differently from the
      // app these specs describe. The port is checked above instead, because
      // Playwright's own message here recommends setting this back to `true`.
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // Edge Functions back workspace creation, slug validation and billing.
      // Started here so `pnpm test:e2e` needs nothing running beforehand;
      // Playwright stops whatever it started when the run ends.
      command: "pnpm fns:serve",
      url: `${supabaseUrl}/functions/v1/healthz`,
      // Safe to reuse, unlike Vite: this server takes no E2E-specific flags,
      // so one already serving `healthz` is the same server this would start.
      // `healthz` is a real readiness check rather than a port probe, which
      // matters because a dead runtime leaves Kong answering 503 on this URL
      // while the `fns:serve` process still looks alive.
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
  // Offline runs skip the specs that need a network-fetched DuckDB extension
  // rather than letting them time out against controls that never enable.
  grepInvert: isE2EOfflineMode() ? new RegExp(E2E_ONLINE_TAG) : undefined,
  globalSetup: "./tests/e2e/setup/globalSetup.ts",
  globalTeardown: "./tests/e2e/setup/globalTeardown.ts",
});
