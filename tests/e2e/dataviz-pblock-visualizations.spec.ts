import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { createDashboardWithDataVizBlock } from "./helpers/createDashboardWithDataVizBlock";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
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
 * dashboard editor. SQL aggregations match the column types of the
 * `small-california-covid-sample.csv` dataset (varchar Admin2 / Province_State,
 * numeric Lat / Long_ / daily_new_cases, date `date`).
 */
type VizTypeCase = {
  vizType: SeededVizConfig["vizType"];
  sql: (datasetId: string) => string;
  vizConfig: SeededVizConfig;
  /** Selector that proves the visualization rendered for this type. */
  visibleSelector: string;
};

const VIZ_TYPE_CASES: readonly VizTypeCase[] = [
  {
    vizType: "table",
    sql: (datasetId) => {
      return `SELECT "Admin2", "daily_new_cases" FROM "${datasetId}" LIMIT 10`;
    },
    vizConfig: { vizType: "table" },
    visibleSelector: '[role="columnheader"]',
  },
  {
    vizType: "bar",
    sql: (datasetId) => {
      return `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "Admin2" ORDER BY total_cases DESC LIMIT 10`;
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
    sql: (datasetId) => {
      return `SELECT "date", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "date" ORDER BY "date" LIMIT 30`;
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
    sql: (datasetId) => {
      return `SELECT "date", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "date" ORDER BY "date" LIMIT 30`;
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
    sql: (datasetId) => {
      return `SELECT "Lat"::DOUBLE AS lat, "Long_"::DOUBLE AS lng FROM "${datasetId}" WHERE "Lat" IS NOT NULL AND "Long_" IS NOT NULL LIMIT 100`;
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
    sql: (datasetId) => {
      return `SELECT "Province_State", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "Province_State" LIMIT 5`;
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
    sql: (datasetId) => {
      return `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "Admin2" ORDER BY total_cases DESC LIMIT 5`;
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
    sql: (datasetId) => {
      return `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total_cases FROM "${datasetId}" GROUP BY "Admin2" ORDER BY total_cases DESC LIMIT 6`;
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
    sql: (datasetId) => {
      return `SELECT "Lat"::DOUBLE AS lat, "Long_"::DOUBLE AS lng, "daily_new_cases"::DOUBLE AS cases FROM "${datasetId}" WHERE "Lat" IS NOT NULL AND "Long_" IS NOT NULL LIMIT 50`;
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

async function _uploadVisualizationDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`);
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
  await expect(page.getByText(/These are the first \d+ rows/)).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (datasetId === undefined) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  await pollUntilCloudDatasetToggleShowsOnline(page);
  return datasetId;
}

async function _assertEveryVisualization(
  options: Readonly<{
    admin: AdminClient;
    dashboardIds: string[];
    datasetId: string;
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
        rawSql: vizCase.sql(options.datasetId),
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
    let uploadedDatasetId = "";

    try {
      await signInWithEmailPassword(page, {
        email: primaryUser.email,
        password: primaryUser.password,
        workspaceSlug,
      });

      await _blockAiGeneration(page);
      const datasetId = await _uploadVisualizationDataset({
        page,
        workspaceSlug,
      });
      uploadedDatasetId = datasetId;
      const workspaceId = await getWorkspaceIdBySlug({
        supabaseAdminClient: admin,
        slug: workspaceSlug,
      });
      await _assertEveryVisualization({
        admin,
        dashboardIds: seededDashboardIds,
        datasetId,
        ownerEmail: primaryUser.email,
        page,
        workspaceId,
        workspaceSlug,
      });
    } finally {
      await deleteDashboardsByIds({ admin, dashboardIds: seededDashboardIds });
      if (uploadedDatasetId) {
        await deleteDatasetAndShares({
          supabaseAdminClient: admin,
          datasetId: uploadedDatasetId,
        });
      }
    }
  });
});
