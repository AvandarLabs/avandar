import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  EXPECTED_CSV_COLUMN_NAMES,
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  SMALL_CALIFORNIA_CSV_PATH,
} from "./helpers/constants";
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

/**
 * Final settings hard-coded so the save assertion can verify that the column
 * headers persisted to the dataset really do match the user-chosen options
 * (and not the original sniffed defaults). Skipping one row promotes the
 * first data row to the header line, which gives unmistakable, unique
 * column names like "California" / "Alameda" / "37.64629437".
 */
const FINAL_SKIP_ROWS = 1;
const FINAL_DELIMITER = ",";

/**
 * Column names that should appear after parsing
 * `small-california-covid-sample.csv` with `numRowsToSkip=1`. They come
 * from the first data row, which becomes the header row once the original
 * header is skipped.
 */
const COLUMN_NAMES_AFTER_SKIP_1 = [
  "California",
  "Alameda",
  "37.64629437",
  "-121.8929271",
  "1588291200000",
  "31",
] as const;

async function setSkipRows(page: Page, value: number): Promise<void> {
  const skipInput = page.getByLabel("Number of rows to skip");
  await skipInput.fill(String(value));
}

async function setDelimiter(page: Page, value: string): Promise<void> {
  const delimiterInput = page.getByLabel("Delimiter", { exact: true });
  await delimiterInput.fill(value);
}

async function clickReparse(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Process data again" }).click();
}

/**
 * Waits for the parse-success callout reporting the given row count. Use
 * this when a positive number of rows is expected.
 */
async function expectParsedRowCount(
  page: Page,
  expectedRowCount: number,
): Promise<void> {
  const formatted = expectedRowCount.toLocaleString("en-US");
  await expect(
    page.getByText(`Parsed ${formatted} rows successfully`),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Waits for the failure callout that appears when DuckDB returns zero
 * rows (e.g. the user skipped past the end of the file).
 */
async function expectParseFailedEmpty(page: Page): Promise<void> {
  await expect(page.getByText("Data processing failed")).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await expect(
    page.getByText("No rows were read successfully"),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

test.describe("CSV parsing options", () => {
  test("toggles delimiter and skip-rows, reparses each time, and save persists the final options", async ({
    page,
    e2eWorkerDb,
  }) => {
    test.setTimeout(240_000);

    const admin = createSupabaseAdminClient();
    const { workspaceSlug, primaryUser } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: primaryUser.email,
      password: primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(SMALL_CALIFORNIA_CSV_PATH);
    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    // Baseline: default sniffed options (delimiter=",", skip=0).
    await expectParsedRowCount(page, SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT);
    await Promise.all(
      EXPECTED_CSV_COLUMN_NAMES.map(async (columnName) => {
        await expect(
          page.getByRole("columnheader", { name: columnName, exact: true }),
        ).toBeVisible({ timeout: SHORT_WAIT });
      }),
    );

    // Variation 1: skip=1 promotes the first data row to the header line.
    // 99 data rows, 6 columns with the new (data-derived) names. This is
    // the FIRST altered configuration that still yields a non-empty
    // preview, so it's the one we'll save with below.
    await setSkipRows(page, 1);
    await clickReparse(page);
    await expectParsedRowCount(page, 99);
    await Promise.all(
      COLUMN_NAMES_AFTER_SKIP_1.map(async (columnName) => {
        await expect(
          page.getByRole("columnheader", { name: columnName, exact: true }),
        ).toBeVisible({ timeout: MEDIUM_WAIT });
      }),
    );
    // The original headers must NOT appear as columns anymore.
    await expect(
      page.getByRole("columnheader", {
        name: "Province_State",
        exact: true,
      }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });

    // Variation 2: skip=5 leaves 95 data rows and shifts the header row
    // further down the file.
    await setSkipRows(page, 5);
    await clickReparse(page);
    await expectParsedRowCount(page, 95);

    // Variation 3: skipping past the end of the file produces 0 rows and
    // triggers the explicit "Data processing failed" callout.
    await setSkipRows(page, 200);
    await clickReparse(page);
    await expectParseFailedEmpty(page);

    // Recover from the failed state so the next variations have a fresh
    // success callout to assert against.
    await setSkipRows(page, 0);
    await clickReparse(page);
    await expectParsedRowCount(page, SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT);

    // Variation 4: a delimiter the file does not use collapses every line
    // into a single column whose name is the entire header line. The
    // expected per-column headers must therefore not be visible.
    await setDelimiter(page, ";");
    await clickReparse(page);
    await expectParsedRowCount(page, SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT);
    await expect(
      page.getByRole("columnheader", {
        name: "Province_State",
        exact: true,
      }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });
    await expect(
      page.getByRole("columnheader", { name: "Admin2", exact: true }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });

    // Variation 5: colon delimiter, same wrong-delimiter effect as `;`.
    await setDelimiter(page, ":");
    await clickReparse(page);
    await expectParsedRowCount(page, SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT);
    await expect(
      page.getByRole("columnheader", {
        name: "Province_State",
        exact: true,
      }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });

    // Variation 6: pipe delimiter, same wrong-delimiter effect.
    await setDelimiter(page, "|");
    await clickReparse(page);
    await expectParsedRowCount(page, SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT);
    await expect(
      page.getByRole("columnheader", {
        name: "Province_State",
        exact: true,
      }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });

    // Final: hard-coded back to the first altered configuration that
    // produced data (skip=1, delimiter=","). Save the dataset with these
    // options and verify the persisted columns reflect them.
    await setDelimiter(page, FINAL_DELIMITER);
    await setSkipRows(page, FINAL_SKIP_ROWS);
    await clickReparse(page);
    await expectParsedRowCount(page, 99);
    await Promise.all(
      COLUMN_NAMES_AFTER_SKIP_1.map(async (columnName) => {
        await expect(
          page.getByRole("columnheader", { name: columnName, exact: true }),
        ).toBeVisible({ timeout: MEDIUM_WAIT });
      }),
    );

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

    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });

    // The saved dataset's data preview must use the headers from the
    // FINAL_SKIP_ROWS / FINAL_DELIMITER configuration, not the headers
    // DuckDB sniffed on the initial upload. If `save` ignored the user's
    // options and saved the original sniffed parse, "Province_State"
    // would still be visible here.
    await Promise.all(
      COLUMN_NAMES_AFTER_SKIP_1.map(async (columnName) => {
        await expect(
          page.getByRole("columnheader", { name: columnName, exact: true }),
        ).toBeVisible({ timeout: MEDIUM_WAIT });
      }),
    );
    await expect(
      page.getByRole("columnheader", {
        name: "Province_State",
        exact: true,
      }),
    ).toHaveCount(0, { timeout: MEDIUM_WAIT });

    await deleteDatasetViaDataManagerUiAndVerify({
      admin,
      datasetId,
      page,
      workspaceId,
      workspaceSlug,
    });
  });
});
