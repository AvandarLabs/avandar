import { test as base } from "@playwright/test";
import { cleanupTestUser } from "../helpers/cleanupTestUser";
import { createSupabaseAdminClient } from "../helpers/supabaseAdminClient";
import { suppressNuxTutorialForUser } from "../helpers/suppressNuxTutorial";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_SECONDARY_USER_EMAIL,
  E2E_TEST_USER_PASSWORD,
  E2E_WORKSPACE_SLUG_BASE,
} from "../setup/e2e-credentials";
import {
  provisionFreshE2EWorkspaceForOwner,
  purgeE2EWorkspacesForOwner,
} from "../setup/e2eTestWorkspaceLifecycle";
import { ensureAuthUserExists } from "../setup/ensureAuthUser";
import type { Page, TestInfo } from "@playwright/test";

export { expect } from "@playwright/test";

export type E2EWorkerCredentials = Readonly<{
  email: string;
  password: string;
}>;

/**
 * Shared worker database state: two auth users and one owned workspace slug.
 */
export type E2EWorkerDb = Readonly<{
  workspaceSlug: string;
  primaryUser: E2EWorkerCredentials;
  secondaryUser: E2EWorkerCredentials;
}>;

type E2EWorkerFixtures = {
  e2eWorkerDb: E2EWorkerDb;
};

type E2ETestFixtures = {
  /**
   * A `page` backed by its **own freshly-launched browser process** instead of
   * the browser Playwright shares across all of a worker's tests.
   *
   * Use it for specs that parse a large file (as a guideline, a data file on
   * the order of ~10,000+ rows; see docs/rules/testing.md). Those large
   * DuckDB-WASM parses flake when they run late in the single-worker run: the
   * shared Chromium process accumulates heap/allocator pressure across ~57 page
   * lifecycles, so the same parse gets slower and can trip its timeout. A
   * dedicated process gives such a spec the "clean desk" it would get in
   * isolation, at ~200-500ms relaunch cost. `workers: 1` means only one browser
   * runs at a time, so this does not add parallel load.
   *
   * Opt in per test by aliasing it to `page` (the test body needs no changes):
   *
   *   test("...", async ({ freshBrowserPage: page, e2eWorkerDb }) => { ... });
   *
   * Being a fixture, it is lazy: the extra browser launches only for tests that
   * destructure it. It mirrors the project's context options (baseURL, reduced
   * motion, viewport) and adds a fallback failure screenshot; see
   * `_attachFreshPageFailureArtifacts` for why Playwright's own screenshot and
   * trace wiring already reaches this context.
   */
  freshBrowserPage: Page;
};

/**
 * Attaches a failure screenshot for a `freshBrowserPage`, as a fallback for
 * Playwright's own capture. Never throws, so cleanup always proceeds.
 *
 * Playwright's `ArtifactsRecorder` does cover this context: it hooks every
 * context made through the `playwright` fixture, including one built by hand
 * with `browser.newContext()`, so both `screenshot: "only-on-failure"` and
 * `trace: "on-first-retry"` already apply. Tracing therefore must not be
 * mirrored here: starting a trace as well threw `tracing.start: Tracing has
 * been already started` on every retry, so no retry of a `freshBrowserPage`
 * spec could pass.
 *
 * The screenshot is still worth duplicating. Playwright caps its own capture
 * at a hardcoded 5s that config cannot raise, and it marks the page as
 * snapshotted before attempting, so one slow capture silently loses the
 * screenshot for the whole test. These specs fail mid heavy DuckDB-WASM parse
 * with the renderer blocked, which is exactly when that 5s is missed, and this
 * capture runs afterwards with no such cap.
 */
async function _attachFreshPageFailureArtifacts(options: {
  page: Page;
  testInfo: TestInfo;
}): Promise<void> {
  const { page, testInfo } = options;
  const failed = testInfo.status !== testInfo.expectedStatus;
  if (failed) {
    await page
      .screenshot()
      .then((body) => {
        return testInfo.attach("screenshot", {
          body,
          contentType: "image/png",
        });
      })
      .catch(() => {});
  }
}

/**
 * Base E2E `test` with a worker-scoped DB fixture: creates dedicated auth
 * users, provisions the shared workspace once per worker, and purges
 * workspace data plus auth users when the worker shuts down.
 */
export const test = base.extend<E2ETestFixtures, E2EWorkerFixtures>({
  freshBrowserPage: async (
    {
      playwright,
      browserName,
      launchOptions,
      baseURL,
      viewport,
      deviceScaleFactor,
      userAgent,
      isMobile,
      hasTouch,
    },
    use,
    testInfo,
  ) => {
    const browser = await playwright[browserName].launch(launchOptions);
    try {
      const context = await browser.newContext({
        baseURL,
        viewport,
        deviceScaleFactor,
        userAgent,
        isMobile,
        hasTouch,
        // Matches playwright.config.ts `use.contextOptions.reducedMotion`.
        reducedMotion: "reduce",
      });

      const page = await context.newPage();
      try {
        await use(page);
      } finally {
        await _attachFreshPageFailureArtifacts({
          page,
          testInfo,
        });
        await context.close().catch(() => {});
      }
    } finally {
      await browser.close().catch(() => {});
    }
  },

  e2eWorkerDb: [
    async ({}, use, workerInfo) => {
      const workspaceSlug = `${E2E_WORKSPACE_SLUG_BASE}-w${workerInfo.workerIndex}`;
      const primaryUser: E2EWorkerCredentials = {
        email: E2E_PRIMARY_USER_EMAIL,
        password: E2E_TEST_USER_PASSWORD,
      };
      const secondaryUser: E2EWorkerCredentials = {
        email: E2E_SECONDARY_USER_EMAIL,
        password: E2E_TEST_USER_PASSWORD,
      };
      const state: E2EWorkerDb = {
        workspaceSlug,
        primaryUser,
        secondaryUser,
      };

      await ensureAuthUserExists(primaryUser);
      await ensureAuthUserExists(secondaryUser);
      // The onboarding tutorial targets workspace owners, and both its
      // invite modal and its checklist panel get in the way of specs that
      // predate it. Suppressed here; the tutorial's own spec resets the row
      // and tests the whole thing for real.
      await suppressNuxTutorialForUser(primaryUser.email);
      await suppressNuxTutorialForUser(secondaryUser.email);
      await provisionFreshE2EWorkspaceForOwner({
        ownerEmail: primaryUser.email,
        workspaceSlug,
      });

      await use(state);

      try {
        const admin = createSupabaseAdminClient();
        await purgeE2EWorkspacesForOwner({
          supabaseAdminClient: admin,
          ownerEmail: primaryUser.email,
          workspaceSlug,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[e2e] worker workspace purge: ${message}`);
      }

      await cleanupTestUser(primaryUser.email);
      await cleanupTestUser(secondaryUser.email);
    },
    { auto: true, scope: "worker" },
  ],
});
