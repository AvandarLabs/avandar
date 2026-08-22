import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import {
  assignE2ESecondaryMemberBuiltinRoleGroup,
  restoreE2ESecondaryMemberRoleGroup,
} from "./helpers/assignE2ESecondaryMemberRole";
import { signInWithEmailPassword, switchToWorkspaceUser } from "./helpers/auth";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { openShareModal, setGeneralAccess } from "./helpers/shareModalFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

/**
 * Removes the `resource_shares` rows a spec created for a dashboard.
 *
 * Deleting the dashboard row does not take them with it: `resource_shares` is
 * polymorphic, so `resource_id` carries no foreign key to cascade from. A left
 * behind row would grant a later run's user access to a dashboard id that no
 * longer exists.
 */
async function _deleteDashboardShares(
  options: Readonly<{ admin: AdminClient; dashboardId: string }>,
): Promise<void> {
  const { error } = await options.admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .eq("resource_id", options.dashboardId);
  if (error) {
    console.warn(`[e2e] dashboard share cleanup: ${error.message}`);
  }
}

/** Deletes a dashboard and every share row pointing at it. */
async function _cleanUpDashboard(
  options: Readonly<{ admin: AdminClient; dashboardId: string | undefined }>,
): Promise<void> {
  if (options.dashboardId === undefined) {
    return;
  }
  await _deleteDashboardShares({
    admin: options.admin,
    dashboardId: options.dashboardId,
  });
  await deleteDashboardsByIds({
    admin: options.admin,
    dashboardIds: [options.dashboardId],
  });
}

/**
 * Grants a user a direct dashboard share.
 *
 * A precondition, not the behavior under test: the specs that use it are about
 * what the share modal offers such a user, not about the sharing write itself
 * (which `share-modal.spec.ts` already drives through the UI).
 */
async function _seedDashboardShare(
  options: Readonly<{
    admin: AdminClient;
    dashboardId: string;
    principalUserId: string;
    role: "viewer" | "editor" | "admin";
    workspaceId: string;
  }>,
): Promise<void> {
  const { error } = await options.admin.from("resource_shares").insert({
    resource_type: "dashboard",
    resource_id: options.dashboardId,
    workspace_id: options.workspaceId,
    principal_type: "user",
    principal_id: options.principalUserId,
    role: options.role,
  });
  if (error) {
    throw new Error(`Failed to seed dashboard share: ${error.message}`);
  }
}

/**
 * Publishes the open dashboard to the workspace through the share modal: pick
 * the audience in "General access", then apply it with the footer button.
 *
 * The two steps are deliberately separate in the product: the dropdown only
 * moves the publish target, so the assertion below is what proves the button
 * is the thing that publishes.
 */
async function _publishToWorkspaceViaShareModal(page: Page): Promise<void> {
  await openShareModal(page);
  await setGeneralAccess(page, "Workspace", "viewer");

  const dialog = page.getByRole("dialog", { name: /^Share / });
  await expect(dialog).toContainText("This dashboard is not published yet", {
    timeout: MEDIUM_WAIT,
  });
  // Wait for the custom URL check to come back before pressing publish, the
  // way a user waits for the spinner in that field to become a tick. The
  // seeded dashboard carries a slug, and `onPrimaryAction` refuses to publish
  // over a slug the server has not answered on yet, silently: pressing the
  // button mid-check does nothing at all and the modal never changes.
  await expect(dialog.getByLabel("Custom URL is available")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await dialog.getByRole("button", { name: "Publish to workspace" }).click();
  await expect(dialog).toContainText(
    "This dashboard is published to your workspace",
    { timeout: LONG_WAIT },
  );

  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}

test.describe("dashboard workspace publishing", () => {
  test("an owner publishes to the workspace and a colleague can read it", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const dashboardName = "E2E workspace publish";
    let dashboardId: string | undefined;

    try {
      // Restricted with no shares opens the modal on "Only me", so picking
      // "Anyone in Dashboards" is a real change the user makes, not a no-op.
      dashboardId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: dashboardName,
        isRestricted: true,
      });

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await _publishToWorkspaceViaShareModal(page);

      await switchToWorkspaceUser(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });

      // Discovery: the colleague finds it in their own index, badged as
      // someone else's dashboard.
      await page.getByRole("link", { name: "Dashboards", exact: true }).click();
      const dashboardCard = page
        .locator(".mantine-Card-root")
        .filter({ hasText: dashboardName });
      await expect(dashboardCard).toHaveCount(1, { timeout: LONG_WAIT });
      await expect(dashboardCard).toContainText("Shared with you");

      // The link an owner would paste: a cold load of the workspace-scoped
      // published route.
      await page.goto(`/${workspaceSlug}/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });
      await expect(
        page.getByRole("heading", { name: dashboardName }),
      ).toBeVisible({ timeout: LONG_WAIT });
    } finally {
      await _cleanUpDashboard({ admin, dashboardId });
    }
  });

  test("a signed-out visitor is sent to sign in, not to the dashboard", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug } = e2eWorkerDb;
    const { admin, workspaceId } = e2eViewerMembership;
    const dashboardName = "E2E workspace only";
    let dashboardId: string | undefined;

    try {
      dashboardId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: e2eWorkerDb.primaryUser.email,
        name: dashboardName,
        visibility: "workspace",
        snapshotRevision: crypto.randomUUID(),
      });

      await page.goto(`/${workspaceSlug}/d/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });

      await expect(page).toHaveURL(/\/signin/, { timeout: LONG_WAIT });
      await expect(page.getByText(dashboardName)).toHaveCount(0);
    } finally {
      await _cleanUpDashboard({ admin, dashboardId });
    }
  });

  test("a user without the Dashboards admin role cannot select the public option", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    const { admin, workspaceId, viewerUserId } = e2eViewerMembership;
    const dashboardName = "E2E publish gate";
    let dashboardId: string | undefined;

    // Global Editor grants the Dashboards app at `editor`, which is the tier
    // that may publish to the workspace but not to the web. The resource-level
    // admin share is what keeps the dropdown itself enabled, so the spec tests
    // the option's own disabled state rather than a wholly read-only modal.
    const assignResult = await assignE2ESecondaryMemberBuiltinRoleGroup({
      supabaseAdminClient: admin,
      workspaceId,
      viewerUserId,
      builtinName: "Global Editor",
    });

    try {
      dashboardId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: dashboardName,
        isRestricted: true,
      });
      await _seedDashboardShare({
        admin,
        dashboardId,
        workspaceId,
        principalUserId: viewerUserId,
        role: "admin",
      });

      await signInWithEmailPassword(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`, {
        waitUntil: "domcontentloaded",
      });

      await openShareModal(page);
      const dialog = page.getByRole("dialog", { name: /^Share / });
      await expect(
        dialog.getByText("Only workspace admins can publish to the web."),
      ).toBeVisible({ timeout: MEDIUM_WAIT });

      await dialog.getByRole("combobox", { name: "General access" }).click();
      await expect(
        page.getByRole("option", { name: "Anyone with the link" }),
      ).toHaveAttribute("data-combobox-disabled", "true");
    } finally {
      await _cleanUpDashboard({ admin, dashboardId });
      await restoreE2ESecondaryMemberRoleGroup({
        supabaseAdminClient: admin,
        workspaceId,
        viewerUserId,
        ...assignResult,
      });
    }
  });
});
