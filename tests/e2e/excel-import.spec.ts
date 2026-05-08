import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
  isDatasetParquetInStorage,
} from "../helper/supabaseAdminClient";
import { expect, test } from "./fixtures/e2eTestWorkspace.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_XLSX_PATH,
  CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT,
  CHOLERA_NYC_XLSX_PATH,
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  EXPECTED_CHOLERA_COLUMN_NAMES,
  EXPECTED_CSV_COLUMN_NAMES,
} from "./helpers/constants";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import type { Page } from "@playwright/test";

/**
 * Asserts Excel manual-upload preview: parse callout, row count, preview grid,
 * and an optional sample cell substring visible in the table.
 */
async function expectExcelParsePreview(options: {
  page: Page;
  formattedRowCount: string;
  columnNames: readonly string[];
  sampleCellSubstring: string;
}): Promise<void> {
  await expect(
    options.page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: 120_000 });

  await expect(
    options.page.getByText(
      `Parsed ${options.formattedRowCount} rows successfully`,
    ),
  ).toBeVisible();

  await expect(
    options.page.getByText(/These are the first \d+ rows/),
  ).toBeVisible();

  for (const columnName of options.columnNames) {
    await expect(
      options.page.getByRole("columnheader", { name: columnName }),
    ).toBeVisible();
  }

  await expect(
    options.page.getByText(options.sampleCellSubstring).first(),
  ).toBeVisible();
}

test.describe("Excel manual upload", () => {
  test("imports cholera NYC linelist XLSX then California COVID XLSX", async ({
    page,
  }) => {
    test.setTimeout(360_000);

    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    const fileInput = uploadPanel.locator('input[type="file"]');
    const uploadSubmitButton = uploadPanel.getByRole("button", {
      name: "Upload",
      exact: true,
    });

    await fileInput.setInputFiles(CHOLERA_NYC_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount:
        CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT.toLocaleString("en-US"),
      columnNames: EXPECTED_CHOLERA_COLUMN_NAMES,
      sampleCellSubstring: "Times Square",
    });

    await fileInput.setInputFiles(CALIFORNIA_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount:
        CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US"),
      columnNames: EXPECTED_CSV_COLUMN_NAMES,
      sampleCellSubstring: "California",
    });
  });

  test("after save, parquet is in storage; offline toggle removes it", async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const admin = createSupabaseAdminClient();

    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    const fileInput = uploadPanel.locator('input[type="file"]');
    const uploadSubmitButton = uploadPanel.getByRole("button", {
      name: "Upload",
      exact: true,
    });

    await fileInput.setInputFiles(CALIFORNIA_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount:
        CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US"),
      columnNames: EXPECTED_CSV_COLUMN_NAMES,
      sampleCellSubstring: "California",
    });

    await ensureCloudStorageCheckedAndSaveDataset({
      page,
      workspaceSlug: E2E_SEEDED_WORKSPACE_SLUG,
    });

    const datasetId = parseDatasetIdFromDataManagerUrl({
      url: page.url(),
      workspaceSlug: E2E_SEEDED_WORKSPACE_SLUG,
    });

    if (!datasetId) {
      throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
    }

    const workspaceId = await getWorkspaceIdBySlug({
      admin,
      slug: E2E_SEEDED_WORKSPACE_SLUG,
    });

    await pollUntilCloudDatasetToggleShowsOnline(page);

    await expect
      .poll(
        async () => {
          return isDatasetParquetInStorage({
            admin,
            workspaceId,
            datasetId,
          });
        },
        { timeout: 180_000 },
      )
      .toBe(true);

    await page
      .getByRole("button", { name: "Make offline-only" })
      .first()
      .click();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Make offline-only" })
      .click();

    await expect
      .poll(
        async () => {
          const parquetGone = !(await isDatasetParquetInStorage({
            admin,
            workspaceId,
            datasetId,
          }));
          const offlineToggleVisible = await page
            .getByRole("button", { name: "Allow online syncing" })
            .isVisible();

          return parquetGone && offlineToggleVisible;
        },
        { timeout: 180_000 },
      )
      .toBe(true);
  });
});
