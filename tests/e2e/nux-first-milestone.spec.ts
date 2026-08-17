import { FIRST_DASHBOARD_TUTORIAL_KEY } from "$/models/Nux/NuxProgress.constants";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  formatImportPreviewRowCount,
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { ensureCloudStorageCheckedAndSaveDataset } from "./helpers/manualUploadCloudSyncFlow";
import { createE2ESupabaseViewerClient } from "./helpers/supabase";
import {
  clearWorkspaceResourcesForE2E,
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { E2EWorkerCredentials } from "./fixtures/e2e.fixture";

/**
 * Puts the worker's primary user back where a brand-new user starts.
 *
 * The invite renders only while the progress row is `not_started`, and the
 * worker fixture deliberately seeds every e2e user to `in_progress` so the
 * modal never blocks the other specs. This spec is the one that wants it, so
 * it puts its own user back. Both of the invite's buttons also write
 * `in_progress`, so the reset is what makes a second run of this spec behave
 * like the first.
 *
 * Runs as the user rather than through the service role because RLS then
 * scopes the update to their own row for free, which is exactly the intent.
 */
async function _resetNuxProgress(user: E2EWorkerCredentials): Promise<void> {
  const client = await createE2ESupabaseViewerClient(user);
  try {
    // RLS scopes the update to this user's own rows, so the tutorial key is
    // the only filter needed.
    const { error } = await client
      .from("user_nux_progress")
      .update({ status: "not_started", completed_milestones: [] })
      .eq("tutorial_key", FIRST_DASHBOARD_TUTORIAL_KEY);

    if (error) {
      throw new Error(`[e2e] nux progress reset failed: ${error.message}`);
    }
  } finally {
    await client.auth.signOut();
  }
}

/**
 * Milestone 1 from invite to payoff.
 *
 * Asserts the two things component tests cannot: that the tooltips find their
 * targets in a real browser across a real route change, and that the checklist
 * survives that route change with its progress intact.
 */
test.describe("onboarding tutorial, first milestone", () => {
  // `useNuxEligibility` gates the whole tutorial behind Mantine's `lg`
  // breakpoint, which this theme sets to `75em` (1200px). Playwright's default
  // 1280px clears that by only 80px, so the viewport is pinned wide enough
  // that a future breakpoint or device-preset change fails loudly on its own
  // terms instead of silently rendering no tutorial at all.
  test.use({ viewport: { width: 1440, height: 900 } });

  test("invites, guides an upload, and ticks over to 1/4", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const admin = createSupabaseAdminClient();

    // Hydration auto-checks any milestone whose artifact already exists in the
    // workspace, so a leftover dataset would start the user at milestone 2.
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    await clearWorkspaceResourcesForE2E({
      supabaseAdminClient: admin,
      workspaceId,
    });
    await _resetNuxProgress(primaryUser);

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    // The invite. Both buttons write `in_progress`, so this is the only
    // chance to see it.
    const invite = page.getByRole("dialog", { name: "Welcome to Avandar" });
    await expect(invite).toBeVisible({ timeout: MEDIUM_WAIT });
    await invite.getByRole("button", { name: "Start tour" }).click();

    // Tooltip 1 lands on the upload form after the tutorial routes itself to
    // Import. Nothing in this test navigates; the tutorial does.
    await expect(page).toHaveURL(/\/data-manager\/data-import/, {
      timeout: MEDIUM_WAIT,
    });
    // Joyride's own container test id. Scoping to it keeps "Next" from
    // matching the data grid's pager, and keeps a tooltip assertion from
    // passing on page copy that happens to use the same words.
    const tourTooltip = page.getByTestId("floater");
    await expect(tourTooltip.getByText("Start with a spreadsheet")).toBeVisible(
      { timeout: MEDIUM_WAIT },
    );
    await expect(
      tourTooltip.getByRole("link", { name: "Download our sample" }),
    ).toBeVisible();

    // The spotlight cut-out is what makes these two reachable: Joyride's
    // overlay swallows pointer events everywhere except the step's target.
    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    // The parse-success callout, not the toast of the same news: the toast
    // auto-dismisses and this has to stay true while the tour catches up.
    const formattedRowCount = formatImportPreviewRowCount(
      SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
    );
    await expect(
      page.getByText(`These are the first ${formattedRowCount} rows`, {
        exact: false,
      }),
    ).toBeVisible({ timeout: LONG_WAIT });

    // Tooltip 2 waits for a target that only has content after parsing.
    await tourTooltip.getByRole("button", { name: "Next" }).click();
    await expect(tourTooltip.getByText("Name it and save")).toBeVisible({
      timeout: MEDIUM_WAIT,
    });

    // Saving is what completes the milestone, and it is also what puts the
    // user on the dataset page, which is where the last tooltip lives. This
    // is the same save-and-land step every other import spec uses.
    await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });

    // Tooltip 3 is the payoff, on a different route.
    await expect(
      tourTooltip.getByText("It profiled your data for you"),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    // The checklist survived two route changes and recorded the milestone.
    await expect(page.getByText("1 / 4")).toBeVisible();
  });
});
