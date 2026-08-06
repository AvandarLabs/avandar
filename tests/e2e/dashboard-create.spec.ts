import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT } from "./helpers/timeouts";

test.describe("Dashboards — create via UI", () => {
  test("workspace admin can create a dashboard from the empty state", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const createdDashboardIds: string[] = [];

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await page.goto(`/${workspaceSlug}/dashboards`);

      await page
        .getByRole("button", { name: "Create a dashboard" })
        .first()
        .click();

      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/dashboards/edit/`),
        { timeout: LONG_WAIT },
      );

      const dashboardEditUrlMatch = page
        .url()
        .match(/dashboards\/edit\/([0-9a-f-]{36})/i);
      const dashboardId = dashboardEditUrlMatch?.[1];
      if (dashboardId) {
        createdDashboardIds.push(dashboardId);
      }
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });
});
