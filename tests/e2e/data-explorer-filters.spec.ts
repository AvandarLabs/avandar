/**
 * Filter semantics, driven through the filter panel.
 *
 * These tests build a rule the way a person does (pick a column, pick an
 * operator, type a value) and then judge the rows that come back, so they cover
 * the whole path from the panel through `renderFilterRule` to DuckDB. The exact
 * SQL each operator emits is pinned by `renderFilterRule.test.ts`, and the
 * panel's own interaction (typing, focus, combinator display) by
 * `QueryFiltersField.test.tsx`; what only an end-to-end run can show is that
 * the SQL the panel generates selects the rows its label promises.
 *
 * Case-insensitive-by-default text comparison, and the per-rule `Match case`
 * toggle that turns it off, are what these cover: they are the semantics with
 * no other end-to-end coverage and the ones a person is most likely to notice.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

const DATASET_NAME = "small-california-covid-sample.csv";

/**
 * The county column, and a value that differs from the data only by case. The
 * fixture holds "Alameda"; typing "alameda" is what proves the comparison folds
 * case rather than matching literally.
 */
const COUNTY_COLUMN = "Admin2";
const COUNTY_VALUE_LOWERCASE = "alameda";
const COUNTY_VALUE_IN_DATA = "Alameda";

/**
 * Imports the 100-row fixture and returns its dataset id.
 *
 * Cloud-sync polling is deliberately skipped: the Data Explorer reads the local
 * parquet as soon as the dataset is saved, and waiting for the upload to report
 * online is what pushes this flow past its time budget.
 */
async function _importSmallCaliforniaCsv(options: {
  page: Page;
  workspaceSlug: string;
}): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`);
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
  await ensureCloudStorageCheckedAndSaveDataset({
    page,
    workspaceSlug,
    navigationTimeout: MEDIUM_WAIT,
  });

  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  return datasetId;
}

/**
 * Opens the Data Explorer on the freshly imported dataset, with the query
 * drawer showing the Manual form.
 *
 * Navigates client-side through the sidebar link rather than with `page.goto`.
 * A full reload rehydrates React Query from the throttled IndexedDB persister,
 * which can still hold an empty workspace-datasets list; that list counts as
 * fresh, so it is never refetched and the data-source select stays disabled.
 */
async function _openManualQueryOnDataset(options: {
  page: Page;
  workspaceSlug: string;
}): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}/data-explorer`), {
    timeout: MEDIUM_WAIT,
  });
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });

  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  const dataSourceInput = queryPanel.getByLabel("Data source");
  await expect(dataSourceInput).toBeEnabled({ timeout: MEDIUM_WAIT });
  await dataSourceInput.click();
  await page.getByRole("option", { name: DATASET_NAME }).click();

  // Selecting the source is what registers the dataset with the DuckDB
  // coordinator for this page session and runs the first query.
  await expect(
    page.getByRole("columnheader", { name: COUNTY_COLUMN }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Adds one condition through the filter panel: column, operator, then value.
 *
 * The value is typed and then committed with Enter, which is what the panel
 * treats as "done editing" and what releases the debounced query.
 */
async function _addFilterCondition(options: {
  page: Page;
  columnName: string;
  operatorLabel: string;
  value: string;
}): Promise<void> {
  const { page, columnName, operatorLabel, value } = options;
  const filters = page.getByTestId("query-filters-field");

  await filters.getByRole("button", { name: "+ Condition" }).click();

  await filters.getByRole("combobox", { name: "Column", exact: true }).click();
  await page.getByRole("option", { name: columnName, exact: true }).click();

  await filters
    .getByRole("combobox", { name: "Condition", exact: true })
    .click();
  await page.getByRole("option", { name: operatorLabel, exact: true }).click();

  const valueInput = filters.getByTestId("filter-value-scalar");
  await valueInput.fill(value);
  await valueInput.press("Enter");
}

/** Every value rendered in one column of the results grid. */
async function _getColumnCellTexts(options: {
  page: Page;
  columnName: string;
}): Promise<string[]> {
  const { page, columnName } = options;
  const header = page.getByRole("columnheader", { name: columnName });
  const columnIndex = await header.evaluate((element) => {
    return Number(element.getAttribute("aria-colindex") ?? "0");
  });
  const cells = page.locator(
    `[role="gridcell"][aria-colindex="${columnIndex}"]`,
  );
  return cells.allInnerTexts();
}

test.describe("Data Explorer filter semantics", () => {
  // Importing a dataset and running two queries against it exceeds the default
  // per-test budget.
  test.slow();

  test("a text filter built in the panel matches regardless of case, until Match case is on", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    const datasetId = await _importSmallCaliforniaCsv({ page, workspaceSlug });
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    try {
      await _openManualQueryOnDataset({ page, workspaceSlug });

      await _addFilterCondition({
        page,
        columnName: COUNTY_COLUMN,
        operatorLabel: "is",
        value: COUNTY_VALUE_LOWERCASE,
      });

      // The panel states what it applied, so a rule that was silently dropped
      // as incomplete cannot be mistaken for one that matched nothing.
      await expect(page.getByRole("status")).toContainText("1 filter applied", {
        timeout: MEDIUM_WAIT,
      });

      await expect
        .poll(
          async () => {
            return _getColumnCellTexts({ page, columnName: COUNTY_COLUMN });
          },
          { timeout: MEDIUM_WAIT },
        )
        .toEqual([COUNTY_VALUE_IN_DATA, COUNTY_VALUE_IN_DATA]);

      // Same rule, same value, Match case on: the value no longer matches the
      // data's capitalisation, so nothing should come back.
      await page
        .getByTestId("query-filters-field")
        .getByRole("button", { name: "Match case", exact: true })
        .click();

      await expect
        .poll(
          async () => {
            return _getColumnCellTexts({ page, columnName: COUNTY_COLUMN });
          },
          { timeout: MEDIUM_WAIT },
        )
        .toEqual([]);
    } finally {
      await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
      await deleteDatasetViaDataManagerUiAndVerify({
        admin,
        datasetId,
        page,
        workspaceId,
        workspaceSlug,
      });
    }
  });

  test("an incomplete rule is named rather than applied", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    const datasetId = await _importSmallCaliforniaCsv({ page, workspaceSlug });
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    try {
      await _openManualQueryOnDataset({ page, workspaceSlug });

      const filters = page.getByTestId("query-filters-field");
      await filters.getByRole("button", { name: "+ Condition" }).click();

      // A rule with no value must not run as `col = ''`, which would empty the
      // grid, and must not be silently ignored either.
      await expect(page.getByRole("status")).toContainText("not applied", {
        timeout: SHORT_WAIT,
      });
      // Rows are still there. The grid virtualizes, so the assertion is on the
      // first county and on there being many rows rather than on the exact set
      // of rendered cells, which shifts with scroll position.
      await expect
        .poll(
          async () => {
            return _getColumnCellTexts({ page, columnName: COUNTY_COLUMN });
          },
          { timeout: MEDIUM_WAIT },
        )
        .toEqual(
          expect.arrayContaining([COUNTY_VALUE_IN_DATA, "Alpine", "Amador"]),
        );
    } finally {
      await page.goto(`/${workspaceSlug}/data-manager/${datasetId}`);
      await deleteDatasetViaDataManagerUiAndVerify({
        admin,
        datasetId,
        page,
        workspaceId,
        workspaceSlug,
      });
    }
  });
});
