import { objectValuesMap, promiseMapSequential } from "@avandar/utils";
import { expect, type Page } from "@playwright/test";
import { closeChat } from "./closeChat";
import { ensureDataset } from "./ensureDataset";
import { ensureFixtureDataset } from "./ensureFixtureDataset";
import { getRecordIdFromPageUrl } from "./getRecordIdFromPageUrl";
import { isRestListResponse } from "./isRestListResponse";
import type {
  CaptureFlow,
  CaptureFlowContext,
} from "../scripts/captureAvandar/captureAvandar.types";
import type { FlowContext, FlowRecord } from "./captureFlows.types";
/**
 * Recorded cases per district, as the explorer's aggregate query returns
 * them.
 */
const DISTRICT_CASE_COUNTS: ReadonlyArray<readonly [string, number]> = [
  ["Eastbank", 56],
  ["North Quay", 51],
  ["South Gardens", 40],
  ["Lakeside", 39],
  ["Ridge", 29],
  ["West Marsh", 25],
];
async function _navigate({
  page,
  options,
}: Readonly<{
  page: Page;
  options: Readonly<{
    linkName: string;
    urlSuffix: string;
  }>;
}>): Promise<void> {
  await page.getByRole("link", { name: options.linkName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(options.urlSuffix));
}
async function _importFlow(context: FlowContext): Promise<void> {
  await ensureDataset({ context, key: "cases", shouldDemonstrate: true });
  // Each import drives the one recording page, so they run in order.
  for (const key of ["visits", "facilities", "districts"]) {
    await ensureDataset({ context, key });
  }
}
/** Opens the Data Explorer on the cases dataset in manual query mode. */
async function _openExplorer(context: FlowContext): Promise<FlowRecord> {
  const dataset = await ensureFixtureDataset({
    context,
    key: "cases",
  });
  await _navigate({
    page: context.page,
    options: {
      linkName: "Data Explorer",
      urlSuffix: `/${context.workspace}/data-explorer`,
    },
  });
  await context.page
    .getByRole("heading", { name: "Data Explorer", exact: true })
    .waitFor();
  await closeChat(context.page);
  await context.page.getByRole("tab", { name: "Query", exact: true }).click();
  const manual = context.page
    .getByRole("radiogroup", { name: "Query editor mode" })
    .getByText("Manual", { exact: true });
  if (await manual.count()) {
    await manual.click();
  }
  const source = context.page
    .getByRole("tabpanel", { name: "Query", exact: true })
    .getByLabel("Data source", { exact: true });
  await expect(source).toBeEnabled();
  await source.click();
  await context.page
    .getByRole("option", { name: dataset.name, exact: true })
    .click();
  await context.page
    .getByRole("columnheader", { name: "case_id", exact: true })
    .waitFor({ timeout: 20000 });
  return dataset;
}
async function _filterEastbank(page: Page): Promise<void> {
  const filters = page.getByTestId("query-filters-field");
  await filters
    .getByRole("button", { name: "+ Condition", exact: true })
    .click();
  await filters.getByRole("combobox", { name: "Column", exact: true }).click();
  await page
    .getByRole("option", { name: "district_name", exact: true })
    .click();
  await filters.getByTestId("filter-value-scalar").fill("Eastbank");
  await filters.getByTestId("filter-value-scalar").press("Enter");
  await page
    .getByText("1 to 50 of 56", { exact: true })
    .waitFor({ timeout: 20000 });
}
async function _aggregateDistricts({
  page,
  datasetId,
}: Readonly<{
  page: Page;
  datasetId: string;
}>): Promise<void> {
  await page
    .getByRole("radiogroup", { name: "Query editor mode" })
    .getByText("SQL", { exact: true })
    .click();
  await page.getByRole("button", { name: "Edit query", exact: true }).click();
  const sql = `SELECT district_name, count(*) AS recorded_cases FROM "${datasetId}" GROUP BY district_name ORDER BY recorded_cases DESC`;
  await page
    .getByRole("tabpanel", { name: "Query", exact: true })
    .getByRole("textbox")
    .fill(sql);
  await page.getByRole("button", { name: "Re-run query", exact: true }).click();
  await page
    .getByRole("columnheader", { name: "recorded_cases", exact: true })
    .waitFor({ timeout: 20000 });
  // Each row check reads the one recording page, so they run in order.
  await promiseMapSequential(
    DISTRICT_CASE_COUNTS,
    async ([district, numCases]) => {
      await expect(
        page.getByRole("row", {
          name: `${district} ${numCases.toFixed(2)}`,
          exact: true,
        }),
      ).toBeVisible();
    },
  );
}
async function _showBarChart(page: Page): Promise<void> {
  await page.getByRole("tab", { name: "Visualizations", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Visualization Type", exact: true })
    .click();
  await page.getByRole("option", { name: "Bar Chart", exact: true }).click();
  const seriesLabel = page.getByRole("textbox", {
    name: "Series label",
    exact: true,
  });
  await seriesLabel.fill("Recorded cases");
  await seriesLabel.press("Tab");
  await page
    .getByRole("button", { name: "Collapse drawer", exact: true })
    .click();
  await expect(
    page.getByRole("tabpanel", { name: "Visualizations", exact: true }),
  ).not.toBeVisible();
  await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(6);
}
async function _explorer(context: FlowContext): Promise<void> {
  const { page, step, checkpoint } = context;
  const dataset = await step("explorer-select-source", () => {
    return _openExplorer(context);
  });
  await checkpoint("explorer-records");
  await step("explorer-filter-eastbank", () => {
    return _filterEastbank(page);
  });
  await checkpoint("explorer-filtered");
  await step("explorer-aggregate-districts", () => {
    return _aggregateDistricts({
      page,
      datasetId: dataset.id,
    });
  });
  await checkpoint("explorer-query");
  await step("explorer-bar-chart", () => {
    return _showBarChart(page);
  });
  context.state.explorerUrl = page.url();
  await checkpoint("explorer-chart");
}
/**
 * Waits for the save form to render the fetched dashboard list or name
 * field.
 */
async function _waitForDashboardForm(page: Page): Promise<void> {
  const response = await page.waitForResponse((dashboardResponse) => {
    return isRestListResponse({
      response: dashboardResponse,
      table: "dashboards",
    });
  });
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Dashboard list did not return a collection.");
  }
  await (rows.length
    ? page.getByRole("listbox", { name: "Dashboards", exact: true }).waitFor()
    : page.getByLabel("Dashboard name", { exact: true }).waitFor());
}
/** Saves the explorer view to the run's dashboard, reusing it if it exists. */
async function _saveViewToDashboard({
  page,
  name,
}: Readonly<{
  page: Page;
  name: string;
}>): Promise<void> {
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const fetchedDashboards = _waitForDashboardForm(page);
  await page
    .getByRole("menuitem", { name: "Save to dashboard", exact: true })
    .click();
  // The form first assumes no dashboards, then switches to the fetched list.
  // A visible list also covers an already cached result with no new request.
  await Promise.race([
    fetchedDashboards,
    page.getByRole("listbox", { name: "Dashboards", exact: true }).waitFor(),
  ]);
  const existingDashboardOption = page
    .getByRole("option")
    .filter({ has: page.getByText(name, { exact: true }) });
  if (await existingDashboardOption.count()) {
    // Reuse the completed artifact without appending a duplicate chart.
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    return;
  }
  const createDashboardButton = page.getByRole("button", {
    name: "Create new dashboard",
    exact: true,
  });
  if (await createDashboardButton.isVisible()) {
    await createDashboardButton.click();
  }
  await page.getByLabel("Dashboard name", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Create dashboard & save", exact: true })
    .click();
  await page
    .getByText(`Created "${name}"`, { exact: true })
    .waitFor({ timeout: 20000 });
}
async function _dashboards(context: FlowContext): Promise<void> {
  const { page, step, checkpoint, runLabel } = context;
  if (!context.state.explorerUrl) {
    await _explorer(context);
  }
  const name = `Video - Harborfield response overview - ${runLabel}`;
  await step("dashboard-save-view", () => {
    return _saveViewToDashboard({
      page,
      name,
    });
  });
  await step("dashboard-open-editor", async () => {
    await _navigate({
      page,
      options: {
        linkName: "Dashboards",
        urlSuffix: `/${context.workspace}/dashboards`,
      },
    });
    await page.getByText(name, { exact: true }).click();
    await page.getByRole("button", { name: "View", exact: true }).waitFor();
  });
  const id = getRecordIdFromPageUrl({
    page,
    segment: "dashboards",
  });
  context.state.dashboard = { id, name };
  await context.recordResource?.({ kind: "dashboard", id, name });
  await checkpoint("dashboard-editor");
  await step("dashboard-preview", async () => {
    await page.getByRole("button", { name: "View", exact: true }).click();
    await page
      .getByText("Previewing this dashboard", { exact: true })
      .waitFor();
    await expect(page.locator(".recharts-bar-rectangle")).toHaveCount(6);
  });
  await checkpoint("dashboard-preview");
}
/**
 * Flow names are stable CLI identifiers, not product feature availability
 * claims.
 */
const PRODUCT_FLOWS: Readonly<
  Record<string, (context: FlowContext) => Promise<void>>
> = {
  import: _importFlow,
  explorer: _explorer,
  dashboards: _dashboards,
  cases: async (context) => {
    return (await import("./casesMap/runCasesFlow/runCasesFlow")).runCasesFlow(
      context,
    );
  },
  map: async (context) => {
    return (await import("./casesMap/runMapFlow/runMapFlow")).runMapFlow(
      context,
    );
  },
};
/**
 * The Avandar capture flows `pnpm capture` runs, by CLI name. `loadFlows`
 * reads it. A failed run retains the actual screen and redacted visible text
 * for selector diagnosis.
 */
export const AvandarCaptureFlows: Record<string, CaptureFlow> = objectValuesMap(
  PRODUCT_FLOWS,
  (flow) => {
    return async (context: CaptureFlowContext) => {
      try {
        return await flow(context);
      } catch (error) {
        await context.checkpoint("failure", { text: true }).catch(() => {});
        throw error;
      }
    };
  },
);
