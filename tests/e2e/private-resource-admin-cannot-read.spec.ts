import {
  expect,
  test,
} from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

/**
 * The P1 guarantee, end to end: a workspace Settings Admin cannot reach a
 * dashboard another member has kept private, sees only a count of it, and can
 * reassign ownership without ever reading it.
 *
 * Roles in this harness: the worker's `primaryUser` is the workspace owner,
 * which this codebase always makes a Global Admin (a Settings Admin) on
 * provisioning (see `_insertE2EWorkspaceForOwner`). `secondaryUser` is made a
 * plain Global Viewer member by `e2eViewerMembership`, and owns the private
 * dashboard here. That gives us the two distinct roles the guarantee needs:
 * an owner who is not an admin, and an admin who is not the owner.
 *
 * Spec: docs/superpowers/specs/
 *   2026-08-13-private-resource-permissions-hardening-design.md
 */
test.describe("private resources are hidden from workspace admins", () => {
  test("admin sees a count, not the dashboard, and can reassign it", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const dashboardName = "Private e2e dashboard";
    let dashboardId: string | undefined;

    try {
      // ---- setup -------------------------------------------------------
      // A dashboard owned by the plain member, kept private (is_restricted,
      // no resource_shares row granting anyone else access).
      dashboardId = await seedDashboard({
        admin,
        workspaceId: e2eViewerMembership.workspaceId,
        ownerEmail: secondaryUser.email,
        name: dashboardName,
        isRestricted: true,
      });

      // ---- signed in as the Settings Admin (workspace owner) -----------
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      // The dashboard must not appear in the admin's dashboards list.
      await page.goto(`/${workspaceSlug}/dashboards`);
      await expect(page.getByText(dashboardName)).toHaveCount(0);

      // Nor be reachable by direct URL.
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);
      await expect(page.getByText("Not Found")).toBeVisible({
        timeout: LONG_WAIT,
      });

      // But the count is visible in the privacy log, as a count only.
      await page.goto(`/${workspaceSlug}/settings/privacy`);
      await page.getByRole("tab", { name: "Private resources" }).click();

      const memberRow = page.getByRole("row", { name: /E2E Viewer/ });
      await expect(memberRow).toBeVisible({ timeout: MEDIUM_WAIT });
      await expect(memberRow.getByRole("cell").nth(1)).toHaveText("1");
      await expect(
        page.getByText(/never visible to workspace admins/i),
      ).toBeVisible();

      // Reassigning moves it without ever showing its contents.
      await memberRow.getByRole("button", { name: /reassign/i }).click();

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: MEDIUM_WAIT });
      await modal.getByRole("combobox", { name: "New owner" }).click();
      await page.getByRole("option").first().click();
      await modal.getByRole("button", { name: /^reassign$/i }).click();

      await expect(page.getByText(/ownership reassigned/i)).toBeVisible({
        timeout: MEDIUM_WAIT,
      });
      await expect(memberRow.getByRole("cell").nth(1)).toHaveText("0");
    } finally {
      // Cleanup does not depend on the reassignment above having run (or
      // succeeded): delete the seeded dashboard directly so the worker's
      // teardown of `secondaryUser` never trips over an owned row.
      if (dashboardId) {
        await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
      }
    }
  });
});
