import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import {
  deleteAllDashboardsForOwner,
  deleteDashboardsByIds,
  seedDashboard,
} from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

const MOCK_SQL = "SELECT 1 AS mocked_column";

/**
 * Loads the Data Explorer with a pre-seeded `?sql=` query so we don't have to
 * exercise the AI prompt form (which would require a real dataset and a real
 * `/queries/*\/generate` call). The seeded SQL is `SELECT 1 AS mocked_column`
 * which the workspace query engine evaluates without any tables - enough to
 * produce a non-empty result so the "Save" menu items become enabled.
 */
async function goToDataExplorerWithSeededSQL(options: {
  page: import("@playwright/test").Page;
  workspaceSlug: string;
}): Promise<void> {
  const url = `/${options.workspaceSlug}/data-explorer?sql=${encodeURIComponent(
    MOCK_SQL,
  )}`;
  await options.page.goto(url);
  await dismissBlockingOverlays(options.page);

  // Wait for the result grid to render at least one cell. This confirms the
  // SQL ran and `queryResultData.length > 0`, which is the gate that enables
  // the Save menu items.
  await expect(
    options.page.getByRole("columnheader", { name: /mocked_column/i }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

test.describe("Save to dashboard", () => {
  test("creates a dashboard from scratch when the user has none", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    // Pre-clean: assert "no dashboards" state.
    await deleteAllDashboardsForOwner({
      admin,
      workspaceId,
      ownerEmail: primaryUser.email,
    });

    const createdDashboardIds: string[] = [];

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await goToDataExplorerWithSeededSQL({ page, workspaceSlug });

      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      // Modal opens directly in create mode because no dashboards exist.
      await expect(
        page.getByText(/we'll add this visualization to your new dashboard/i),
      ).toBeVisible({ timeout: SHORT_WAIT });
      await expect(
        page.getByPlaceholder(/search dashboards/i),
      ).not.toBeVisible();

      const dashboardName = "E2E save-to-dashboard A";
      const nameInput = page.getByLabel(/dashboard name/i);
      await nameInput.fill(dashboardName);
      await page
        .getByRole("button", { name: /create dashboard & save/i })
        .click();

      // Success toast appears with the verb "Created".
      await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
        timeout: LONG_WAIT,
      });

      // Database side-effect: the dashboard was inserted with one DataViz
      // block as the only content entry.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("dashboards")
              .select("id, name, config")
              .eq("workspace_id", workspaceId)
              .eq("name", dashboardName);
            return data?.length ?? 0;
          },
          { timeout: LONG_WAIT },
        )
        .toBe(1);

      const { data: createdRows } = await admin
        .from("dashboards")
        .select("id, config")
        .eq("workspace_id", workspaceId)
        .eq("name", dashboardName);
      const created = createdRows?.[0];
      expect(created).toBeDefined();
      if (created) {
        createdDashboardIds.push(created.id as string);
        const config = created.config as {
          content: Array<{ type: string }>;
        };
        expect(config.content).toHaveLength(1);
        expect(config.content[0]?.type).toBe("DataViz");
      }
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: createdDashboardIds });
    }
  });

  test("appends a DataViz block to a chosen existing dashboard", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    const seededIds: string[] = [];

    try {
      const targetName = "E2E pick-existing target";
      const otherName = "E2E pick-existing other";
      seededIds.push(
        await seedDashboard({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          name: otherName,
        }),
      );
      const targetId = await seedDashboard({
        admin,
        workspaceId,
        ownerEmail: primaryUser.email,
        name: targetName,
      });
      seededIds.push(targetId);

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await goToDataExplorerWithSeededSQL({ page, workspaceSlug });

      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      // Modal opens in list mode.
      const listbox = page.getByRole("listbox", { name: /dashboards/i });
      await expect(listbox).toBeVisible({ timeout: SHORT_WAIT });

      // Pick the target row.
      await listbox.getByRole("option", { name: targetName }).click();
      await page.getByRole("button", { name: /^save to dashboard$/i }).click();

      // Success toast appears with the verb "Added to".
      await expect(page.getByText(`Added to "${targetName}"`)).toBeVisible({
        timeout: LONG_WAIT,
      });

      // Database side-effect: the chosen dashboard now has exactly one
      // DataViz block at the end of its content array.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("dashboards")
              .select("config")
              .eq("id", targetId)
              .maybeSingle();
            const config = data?.config as
              | { content: Array<{ type: string }> }
              | undefined;
            return config?.content?.length ?? 0;
          },
          { timeout: LONG_WAIT },
        )
        .toBe(1);

      const { data: targetRow } = await admin
        .from("dashboards")
        .select("config")
        .eq("id", targetId)
        .single();
      const targetConfig = targetRow!.config as {
        content: Array<{ type: string }>;
      };
      expect(targetConfig.content.at(-1)?.type).toBe("DataViz");
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: seededIds });
    }
  });

  test("creates a brand-new dashboard from the list-mode 'Create new' button", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    const seededIds: string[] = [];
    const createdNames: string[] = [];

    try {
      seededIds.push(
        await seedDashboard({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          name: "E2E create-from-list seed",
        }),
      );

      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await goToDataExplorerWithSeededSQL({ page, workspaceSlug });

      await page.getByRole("button", { name: /^save$/i }).click();
      await page.getByRole("menuitem", { name: /save to dashboard/i }).click();

      // Modal opens in list mode. Switch to create mode and confirm Back link.
      await expect(
        page.getByRole("listbox", { name: /dashboards/i }),
      ).toBeVisible({ timeout: SHORT_WAIT });
      await page.getByRole("button", { name: /create new dashboard/i }).click();
      await expect(
        page.getByRole("button", { name: /back to dashboards/i }),
      ).toBeVisible();

      // Toggle back to verify the navigation works, then re-enter create mode.
      await page.getByRole("button", { name: /back to dashboards/i }).click();
      await expect(
        page.getByRole("listbox", { name: /dashboards/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: /create new dashboard/i }).click();

      const dashboardName = "E2E create-from-list new";
      createdNames.push(dashboardName);
      await page.getByLabel(/dashboard name/i).fill(dashboardName);
      await page
        .getByRole("button", { name: /create dashboard & save/i })
        .click();

      await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
        timeout: LONG_WAIT,
      });

      // Database side-effect: a fresh dashboard was created with the block.
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from("dashboards")
              .select("id")
              .eq("workspace_id", workspaceId)
              .eq("name", dashboardName);
            return data?.length ?? 0;
          },
          { timeout: LONG_WAIT },
        )
        .toBe(1);
    } finally {
      const { data: createdRows } = await admin
        .from("dashboards")
        .select("id")
        .in("name", createdNames);
      const createdIds = (createdRows ?? []).map((row) => {
        return row.id as string;
      });
      await deleteDashboardsByIds({
        admin,
        dashboardIds: [...seededIds, ...createdIds],
      });
    }
  });
});
