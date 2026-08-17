import { expect, test } from "./fixtures/e2eWithGlobalViewerMembership.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDashboardsByIds, seedDashboard } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function _shareDashboardWithViewer(
  options: Readonly<{
    admin: AdminClient;
    dashboardId: string;
    viewerUserId: string;
    workspaceId: string;
  }>,
): Promise<void> {
  const { error } = await options.admin.from("resource_shares").insert({
    resource_type: "dashboard",
    resource_id: options.dashboardId,
    workspace_id: options.workspaceId,
    principal_type: "user",
    principal_id: options.viewerUserId,
    role: "viewer",
  });
  if (error) {
    throw new Error(`Failed to seed dashboard viewer share: ${error.message}`);
  }
}

async function _deleteViewerDashboard(
  options: Readonly<{
    admin: AdminClient;
    dashboardId: string | undefined;
    viewerUserId: string;
    workspaceId: string;
  }>,
): Promise<void> {
  if (options.dashboardId === undefined) {
    return;
  }
  await options.admin
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .eq("resource_id", options.dashboardId)
    .eq("workspace_id", options.workspaceId)
    .eq("principal_type", "user")
    .eq("principal_id", options.viewerUserId);
  await deleteDashboardsByIds({
    admin: options.admin,
    dashboardIds: [options.dashboardId],
  });
}

async function _assertViewerPreviewRoute(
  options: Readonly<{
    dashboardId: string;
    page: Page;
    workspaceSlug: string;
  }>,
): Promise<void> {
  await options.page.goto(
    `/${options.workspaceSlug}/dashboards/edit/${options.dashboardId}`,
  );
  await expect(options.page).toHaveURL(
    new RegExp(
      `/${options.workspaceSlug}/dashboards/preview/${options.dashboardId}`,
    ),
    { timeout: LONG_WAIT },
  );
  await expect(
    options.page.getByRole("button", { name: /back to editor/i }),
  ).toHaveCount(0);
}

/** Verifies that viewer-role dashboard shares use the read-only preview. */
test.describe("viewer-role dashboard routing", () => {
  test("a viewer-role user lands on preview, not the editor", async ({
    page,
    e2eWorkerDb,
    e2eViewerMembership,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser, secondaryUser } = e2eWorkerDb;
    let dashboardId: string | undefined;

    try {
      // Published to the workspace rather than left as a draft. A draft is
      // hidden from a viewer-level share by
      // `util__auth_user_may_select_dashboard`, so a draft fixture could never
      // reach the preview route at all; publishing is the realistic shape of a
      // dashboard a viewer is meant to open.
      dashboardId = await seedDashboard({
        admin,
        workspaceId: e2eViewerMembership.workspaceId,
        ownerEmail: primaryUser.email,
        name: "Viewer routing e2e dashboard",
        isRestricted: true,
        visibility: "workspace",
        snapshotRevision: crypto.randomUUID(),
      });
      await _shareDashboardWithViewer({
        admin,
        dashboardId,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
      });
      await signInWithEmailPassword(page, {
        email: secondaryUser.email,
        password: secondaryUser.password,
        workspaceSlug,
      });
      await _assertViewerPreviewRoute({ page, workspaceSlug, dashboardId });
    } finally {
      await _deleteViewerDashboard({
        admin,
        dashboardId,
        workspaceId: e2eViewerMembership.workspaceId,
        viewerUserId: e2eViewerMembership.viewerUserId,
      });
    }
  });
});
