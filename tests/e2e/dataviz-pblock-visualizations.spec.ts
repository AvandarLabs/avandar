import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { createDashboardWithDataVizBlock } from "./helpers/createDashboardWithDataVizBlock";
import { deleteDashboardsByIds } from "./helpers/seedDashboard";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { SeededVizConfig } from "./helpers/createDashboardWithDataVizBlock";
import type { Page } from "@playwright/test";

/**
 * Per-viz-type seeds used to verify every visualization renders inside the
 * dashboard editor.
 *
 * Each result is a literal `VALUES` query rather than an aggregation over an
 * uploaded dataset, which is what `docs/rules/e2e-testing.md` asks of a spec
 * that asserts rendering: querying a real dataset here inherited the data
 * pipeline's flakiness for no coverage, because what is under test is whether
 * every viz type draws, not whether a query runs.
 *
 * Concretely, each case navigates to the editor with `page.goto`, and a full
 * page load starts an empty DuckDB and rehydrates a possibly stale-empty
 * workspace-datasets list, which gates the on-demand registration in
 * `WorkspaceQuerySession.runQuery`. Querying by dataset id therefore raced
 * that registration: `renders table` either drew in ~4s or never drew at all,
 * so the spec failed hard at its 15s ceiling roughly one run in three. A
 * literal result has nothing to register. `save-to-dashboard-renders-in-editor`
 * seeds the same way for the same reason.
 *
 * Column names still mirror the old dataset's (varchar Admin2 /
 * Province_State, numeric lat / lng / daily_new_cases, date `date`) so each
 * `vizConfig` below is unchanged.
 */
type VizTypeCase = {
  vizType: SeededVizConfig["vizType"];
  sql: () => string;
  vizConfig: SeededVizConfig;
  /** Selector that proves the visualization rendered for this type. */
  visibleSelector: string;
};

const VIZ_TYPE_CASES: readonly VizTypeCase[] = [
  {
    vizType: "table",
    sql: () => {
      return (
        `SELECT * FROM (VALUES ('Riverside', 12), ('Orange', 9), ` +
        `('Kern', 5)) AS t("Admin2", "daily_new_cases")`
      );
    },
    vizConfig: { vizType: "table" },
    visibleSelector: '[role="columnheader"]',
  },
  {
    vizType: "bar",
    sql: () => {
      return (
        `SELECT * FROM (VALUES ('Riverside', 1800.0), ('Orange', 1600.0), ` +
        `('Kern', 900.0)) AS t("Admin2", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "bar",
      xAxisKey: "Admin2",
      yAxisKey: "total_cases",
      withLegend: true,
    },
    visibleSelector: ".recharts-bar",
  },
  {
    vizType: "line",
    sql: () => {
      return (
        `SELECT * FROM (VALUES (DATE '2020-03-01', 10.0), ` +
        `(DATE '2020-03-02', 20.0), (DATE '2020-03-03', 15.0)) ` +
        `AS t("date", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "line",
      xAxisKey: "date",
      yAxisKey: "total_cases",
      withLegend: false,
      curveType: "monotone",
    },
    visibleSelector: ".recharts-line",
  },
  {
    vizType: "area",
    sql: () => {
      return (
        `SELECT * FROM (VALUES (DATE '2020-03-01', 10.0), ` +
        `(DATE '2020-03-02', 20.0), (DATE '2020-03-03', 15.0)) ` +
        `AS t("date", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "area",
      xAxisKey: "date",
      yAxisKey: "total_cases",
      withLegend: false,
      curveType: "monotone",
    },
    visibleSelector: ".recharts-area",
  },
  {
    vizType: "scatter",
    sql: () => {
      return (
        `SELECT * FROM (VALUES (33.9, -117.4), (33.7, -117.8), ` +
        `(35.4, -119.0)) AS t("lat", "lng")`
      );
    },
    vizConfig: {
      vizType: "scatter",
      xAxisKey: "lat",
      yAxisKey: "lng",
    },
    visibleSelector: ".recharts-scatter",
  },
  {
    vizType: "pie",
    sql: () => {
      return (
        `SELECT * FROM (VALUES ('California', 1800.0), ` +
        `('Nevada', 900.0)) AS t("Province_State", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "pie",
      nameKey: "Province_State",
      valueKey: "total_cases",
      isDonut: false,
      withLabels: true,
      labelsType: "value",
    },
    visibleSelector: ".recharts-pie",
  },
  {
    vizType: "funnel",
    sql: () => {
      return (
        `SELECT * FROM (VALUES ('Riverside', 1800.0), ('Orange', 1600.0), ` +
        `('Kern', 900.0)) AS t("Admin2", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "funnel",
      nameKey: "Admin2",
      valueKey: "total_cases",
    },
    visibleSelector: ".recharts-trapezoids",
  },
  {
    vizType: "radar",
    sql: () => {
      return (
        `SELECT * FROM (VALUES ('Riverside', 1800.0), ('Orange', 1600.0), ` +
        `('Kern', 900.0)) AS t("Admin2", "total_cases")`
      );
    },
    vizConfig: {
      vizType: "radar",
      nameKey: "Admin2",
      valueKey: "total_cases",
    },
    visibleSelector: ".recharts-radar",
  },
  {
    vizType: "bubble",
    sql: () => {
      return (
        `SELECT * FROM (VALUES (33.9, -117.4, 12.0), ` +
        `(33.7, -117.8, 8.0), (35.4, -119.0, 5.0)) ` +
        `AS t("lat", "lng", "cases")`
      );
    },
    vizConfig: {
      vizType: "bubble",
      xAxisKey: "lat",
      yAxisKey: "lng",
      sizeKey: "cases",
    },
    visibleSelector: ".recharts-scatter",
  },
];

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function _blockAiGeneration(page: Page): Promise<void> {
  await page.route("**/queries/*/generate*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ sql: `SELECT 1 AS mocked_column` }),
    });
  });
}

async function _assertEveryVisualization(
  options: Readonly<{
    admin: AdminClient;
    dashboardIds: string[];
    ownerEmail: string;
    page: Page;
    workspaceId: string;
    workspaceSlug: string;
  }>,
): Promise<void> {
  for (const vizCase of VIZ_TYPE_CASES) {
    await test.step(`renders ${vizCase.vizType}`, async () => {
      const dashboardId = await createDashboardWithDataVizBlock({
        admin: options.admin,
        workspaceId: options.workspaceId,
        ownerEmail: options.ownerEmail,
        rawSql: vizCase.sql(),
        vizConfig: vizCase.vizConfig,
      });
      options.dashboardIds.push(dashboardId);
      await options.page.goto(
        `/${options.workspaceSlug}/dashboards/edit/${dashboardId}`,
      );
      const editorFrame = options.page.locator("iframe").first().contentFrame();
      const chartElement = editorFrame.locator(vizCase.visibleSelector);
      await expect(chartElement.first()).toBeVisible({ timeout: MEDIUM_WAIT });
    });
  }
}

test.describe("DataViz PBlock - every visualization", () => {
  test("renders every supported visualization in the dashboard editor", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const seededDashboardIds: string[] = [];

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await _blockAiGeneration(page);
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      await _assertEveryVisualization({
        admin,
        dashboardIds: seededDashboardIds,
        ownerEmail: primaryUser.email,
        page,
        workspaceId,
        workspaceSlug,
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: seededDashboardIds });
    }
  });
});
