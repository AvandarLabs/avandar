/**
 * Filter semantics, verified by row count against a known CSV.
 *
 * Expected counts were computed directly from
 * `tests/data/california-covid-sample/california-covid-sample.csv` (14,700
 * rows). They are the contract: if a count changes, either the fixture changed
 * or a predicate's meaning did.
 *
 * Each WHERE clause below is exactly what the filter panel generates for the
 * corresponding operator, so this suite is what catches an operator whose SQL
 * means something other than its label. Builder interaction (typing, focus,
 * combinator display) is covered by `QueryFiltersField.test.tsx`.
 */
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { CALIFORNIA_CSV_PATH } from "./helpers/constants";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import { LONG_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

type FilterCase = {
  name: string;
  /** WHERE clause exactly as the filter panel would generate it. */
  where: string;
  expectedRows: number;
};

const CASES: readonly FilterCase[] = [
  {
    name: "text equals",
    where: `lower("Admin2") = lower('Alameda')`,
    expectedRows: 245,
  },
  {
    name: "text not equals",
    where: `lower("Admin2") <> lower('Alameda')`,
    expectedRows: 14455,
  },
  {
    name: "contains, case insensitive",
    where: `contains(lower("Admin2"), lower('san'))`,
    expectedRows: 2450,
  },
  {
    name: "contains, case sensitive misses",
    where: `contains("Admin2", 'san')`,
    expectedRows: 0,
  },
  {
    name: "does not contain",
    where: `NOT contains(lower("Admin2"), lower('san'))`,
    expectedRows: 12250,
  },
  {
    name: "starts with",
    where: `starts_with(lower("Admin2"), lower('San'))`,
    expectedRows: 2450,
  },
  {
    name: "in list",
    where: `lower("Admin2") IN (lower('Alameda'), lower('Butte'), lower('Kern'))`,
    expectedRows: 735,
  },
  {
    name: "not in list",
    where: `lower("Admin2") NOT IN (lower('Alameda'), lower('Butte'), lower('Kern'))`,
    expectedRows: 13965,
  },
  {
    name: "numeric greater than",
    where: `"daily_new_cases" > 0`,
    expectedRows: 11444,
  },
  {
    name: "numeric at least",
    where: `"daily_new_cases" >= 0`,
    expectedRows: 14510,
  },
  { name: "numeric less than", where: `"daily_new_cases" < 0`, expectedRows: 190 },
  {
    name: "numeric at most",
    where: `"daily_new_cases" <= 0`,
    expectedRows: 3256,
  },
  { name: "numeric equals", where: `"daily_new_cases" = 0`, expectedRows: 3066 },
  {
    name: "numeric in list",
    where: `"daily_new_cases" IN (0, 1, 2)`,
    expectedRows: 4391,
  },
  {
    name: "between",
    where: `"daily_new_cases" BETWEEN 100 AND 200`,
    expectedRows: 1385,
  },
  {
    name: "not between",
    where: `"daily_new_cases" NOT BETWEEN 100 AND 200`,
    expectedRows: 13315,
  },
  {
    name: "is null on a full column",
    where: `"Admin2" IS NULL`,
    expectedRows: 0,
  },
  {
    name: "is not null on a full column",
    where: `"Admin2" IS NOT NULL`,
    expectedRows: 14700,
  },
  {
    name: "is blank on a full column",
    where: `coalesce(trim("Admin2"), '') = ''`,
    expectedRows: 0,
  },
  {
    name: "regex match",
    where: `regexp_matches("Admin2", '^San')`,
    expectedRows: 2450,
  },
  {
    name: "epoch date greater than",
    where: `"date" > 1600000000000`,
    expectedRows: 6540,
  },
  {
    name: "AND of two rules",
    where: `lower("Admin2") = lower('Alameda') and "daily_new_cases" > 100`,
    expectedRows: 150,
  },
  {
    name: "OR of two rules",
    where: `lower("Admin2") = lower('Alameda') or "daily_new_cases" > 100`,
    expectedRows: 3472,
  },
  {
    name: "nested OR inside AND",
    where: `"daily_new_cases" > 100 and (lower("Admin2") = lower('Alameda') or lower("Admin2") = lower('Butte'))`,
    expectedRows: 175,
  },
  {
    name: "nested AND inside OR",
    where: `"daily_new_cases" > 100 or (lower("Admin2") = lower('Alameda') and lower("Admin2") = lower('Butte'))`,
    expectedRows: 3377,
  },
  {
    name: "two sibling groups",
    where: `(lower("Admin2") = lower('Alameda') and "daily_new_cases" > 100) or (lower("Admin2") = lower('Butte') and "daily_new_cases" < 0)`,
    expectedRows: 154,
  },
  {
    name: "value containing a space",
    where: `lower("Admin2") IN (lower('Contra Costa'), lower('Del Norte'))`,
    expectedRows: 490,
  },
  {
    name: "literal percent is not a wildcard",
    where: `contains(lower("Admin2"), lower('%'))`,
    expectedRows: 0,
  },
];

async function _importCaliforniaCsv(options: {
  page: Page;
  workspaceSlug: string;
}): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();
  // Wait on the affordance rather than a success string: the parse callout's
  // wording differs between small and large files, and what matters here is
  // that the dataset is ready to save.
  await expect(
    page.getByRole("button", { name: "Save Dataset" }),
  ).toBeEnabled({ timeout: LONG_WAIT });
  // Save with cloud storage on, then wait for the dataset to report online:
  // a dataset that is still local-only refuses queries from a fresh page with
  // "insufficient dataset lease".
  await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
  await pollUntilCloudDatasetToggleShowsOnline(page);
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (datasetId === undefined) {
    throw new Error("Could not read the dataset id from the URL after import.");
  }
  return datasetId;
}

/**
 * Runs every predicate in one query and returns the counts in case order.
 *
 * The dataset is selected through the Manual form first. A cold page load that
 * only carries `?sql=` has not registered the dataset with the DuckDB
 * coordinator yet and the query is refused with "insufficient dataset lease",
 * so the query is issued from the SQL editor in the same page session instead.
 *
 * Aggregating with `count(*) filter (where ...)` also keeps the assertion off
 * the virtualized grid: the whole result is a single cell.
 */
async function _rowCountsFor(options: {
  page: Page;
  workspaceSlug: string;
  datasetId: string;
  datasetName: string;
  cases: readonly FilterCase[];
}): Promise<readonly number[]> {
  const { page, workspaceSlug, datasetId, datasetName, cases } = options;

  await page.goto(`/${workspaceSlug}/data-explorer`, {
    waitUntil: "domcontentloaded",
  });
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });

  // Selecting the source is what registers the dataset for this page session.
  // The control starts disabled while the workspace's datasets load.
  const sourceSelect = page.getByPlaceholder("Select a data source");
  await expect(sourceSelect).toBeEnabled({ timeout: LONG_WAIT });
  await sourceSelect.click();
  await page.getByRole("option", { name: datasetName }).click();
  await expect(page.getByRole("gridcell").first()).toBeVisible({
    timeout: LONG_WAIT,
  });

  const counts = cases
    .map((filterCase) => {
      return `count(*) filter (where ${filterCase.where})`;
    })
    .join(", ");
  const sql = `select concat_ws(',', ${counts}) as "counts" from "${datasetId}"`;

  await page
    .getByRole("radiogroup", { name: "Query editor mode" })
    .getByText("SQL", { exact: true })
    .click();
  await page.getByRole("button", { name: "Edit query" }).click();
  const editor = page.getByRole("textbox").last();
  await editor.fill(sql);
  await page.getByRole("button", { name: "Re-run query" }).click();

  const cell = page.getByRole("gridcell").first();
  await expect(cell).toBeVisible({ timeout: LONG_WAIT });
  await expect(cell).toContainText(",", { timeout: LONG_WAIT });
  const text = await cell.innerText();
  return text.split(",").map((part) => {
    return Math.round(Number(part.replace(/[^\d.-]/g, "")));
  });
}

test.describe("Data Explorer filter semantics", () => {
  // Importing 14,700 rows, waiting for cloud sync, and running the aggregate
  // takes well past the default per-test ceiling.
  test.slow();

  /*
   * Blocked on e2e harness work, not on the filter layer.
   *
   * The predicates and expected counts below are verified: every count was
   * computed from the CSV, and the same SQL was executed successfully against a
   * real imported dataset in a manual browser session. What does not work yet
   * is getting the Data Explorer to query a freshly imported dataset inside the
   * e2e workspace:
   *
   * - A cold page load carrying only `?sql=` is refused with "DuckDB operation
   *   received an insufficient dataset lease", because that page session has
   *   not registered the dataset with `DatasetDuckDbCoordinator`.
   * - Selecting the source through the Manual form is what normally registers
   *   it, but in the e2e workspace the data source select stays disabled: the
   *   explorer's dataset list comes back empty right after an import that has
   *   already reported itself online.
   *
   * `dataviz-pblock-visualizations.spec.ts` gets a queryable dataset by running
   * raw SQL through a dashboard block created via the admin client, so the fix
   * is probably to seed the query the same way rather than to drive the
   * explorer's UI. Until then this stays `fixme` so it does not sit red.
   *
   * Operator-level coverage meanwhile: `renderFilterRule.test.ts` pins the
   * exact SQL for all 26 operators, and `filterRoundTrip.test.ts` proves each
   * one survives SQL-to-form mapping.
   */
  test.fixme("every filter predicate returns the expected row count", async ({
    page,
    e2eWorkerDb,
  }) => {
    const { workspaceSlug } = e2eWorkerDb;
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    const datasetId = await _importCaliforniaCsv({ page, workspaceSlug });

    const counts = await _rowCountsFor({
      page,
      workspaceSlug,
      datasetId,
      datasetName: "california-covid-sample.csv",
      cases: CASES,
    });

    expect(counts).toHaveLength(CASES.length);
    CASES.forEach((filterCase, index) => {
      expect(counts[index], `${filterCase.name}: ${filterCase.where}`).toBe(
        filterCase.expectedRows,
      );
    });
  });
});
