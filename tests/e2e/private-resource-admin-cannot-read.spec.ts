import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";

type AssertPrivateDashboardIsHiddenOptions = {
  page: Page;
  workspaceSlug: string;
  dashboardId: string;
  dashboardName: string;
};

async function _assertPrivateDashboardIsHidden(
  options: Readonly<AssertPrivateDashboardIsHiddenOptions>,
): Promise<void> {
  await options.page.goto(`/${options.workspaceSlug}/dashboards`);
  await expect(options.page.getByText(options.dashboardName)).toHaveCount(0);

  await options.page.goto(
    `/${options.workspaceSlug}/dashboards/edit/${options.dashboardId}`,
  );
  await expect(options.page.getByText("Not Found")).toBeVisible({
    timeout: LONG_WAIT,
  });
}

async function _openPrivateResourcesTab(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Settings" }).click();
  const privacyLogTab = page.getByRole("tab", { name: "Privacy log" });
  await expect(privacyLogTab).toBeVisible({ timeout: LONG_WAIT });
  await privacyLogTab.click();
  await page.getByRole("tab", { name: "Private resources" }).click();
}

async function _reassignPrivateResources(page: Page): Promise<void> {
  const memberRow = page.getByRole("row", { name: /E2E Viewer/ });
  await expect(memberRow).toBeVisible({ timeout: MEDIUM_WAIT });
  await expect(memberRow.getByRole("cell").nth(1)).toHaveText("1");
  await expect(
    page.getByText(/never visible to workspace admins/i),
  ).toBeVisible();

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
}

/**
 * Verifies that a Settings Admin can reassign owner-private resources without
 * gaining read access to their content.
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
      dashboardId = await seedDashboard({
        admin,
        workspaceId: e2eViewerMembership.workspaceId,
        ownerEmail: secondaryUser.email,
        name: dashboardName,
        isRestricted: true,
      });
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await _assertPrivateDashboardIsHidden({
        page,
        workspaceSlug,
        dashboardId,
        dashboardName,
      });
      await _openPrivateResourcesTab(page);
      await _reassignPrivateResources(page);
    } finally {
      if (dashboardId) {
        await deleteDashboardsByIds({ admin, dashboardIds: [dashboardId] });
      }
    }
  });
});
