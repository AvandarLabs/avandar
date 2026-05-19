import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
import { createDashboardWithDataVizBlock } from "./helpers/createDashboardWithDataVizBlock";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import type { SeededVizConfig } from "./helpers/createDashboardWithDataVizBlock";

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

test.describe("DataViz PBlock - every visualization", () => {
  test("renders every supported visualization in the dashboard editor", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(360_000);

    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    /**
     * Block the AI route at the page level for the entire test so an
     * accidental hit to OpenAI (e.g. someone clicking "Generate Query"
     * during development) cannot escape into a paid request. Tests rely on
     * the pre-seeded `nlQuery.rawSql`, so the response is just a defensive
     * stub the UI would treat as a valid generated SQL.
     */
    await page.route("**/queries/*/generate*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sql: `SELECT 1 AS mocked_column`,
        }),
      });
    });

    // Step 1: upload the California CSV via the manual upload flow.
    await page.goto(`/${workspaceSlug}/data-manager/data-import`);
    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    const formattedRowCount =
      SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
    await expect(
      page.getByText(`Parsed ${formattedRowCount} rows successfully`),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await ensureCloudStorageCheckedAndSaveDataset({
      page,
      workspaceSlug,
    });

    const datasetId = parseDatasetIdFromDataManagerUrl({
      url: page.url(),
      workspaceSlug,
    });
    if (!datasetId) {
      throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
    }
    await pollUntilCloudDatasetToggleShowsOnline(page);

    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    // Step 2: for each viz type, seed a dashboard with the appropriate
    // config and verify the chart renders inside the editor.
    for (const vizCase of VIZ_TYPE_CASES) {
      await test.step(`renders ${vizCase.vizType}`, async () => {
        const dashboardId = await createDashboardWithDataVizBlock({
          admin,
          workspaceId,
          ownerEmail: primaryUser.email,
          rawSql: vizCase.sql(datasetId),
          vizConfig: vizCase.vizConfig,
        });

        await page.goto(`/${workspaceSlug}/dashboards/edit/${dashboardId}`);

        // Puck v0.21 renders the editor canvas inside an iframe by default.
        // The DataViz block is rendered inside the canvas iframe, so query
        // against the first frame on the page.
        const editorFrame = page.locator("iframe").first().contentFrame();
        const chartElement = editorFrame.locator(vizCase.visibleSelector);

        await expect(chartElement.first()).toBeVisible({
          timeout: MEDIUM_WAIT,
        });
      });
    }
  });
});
