import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_XLSX_PATH,
  CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT,
  CHOLERA_NYC_XLSX_PATH,
  formatImportPreviewRowCount,
} from "./helpers/constants";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
  isDatasetParquetInStorage,
} from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

/**
 * Asserts Excel manual-upload preview: parse callout, row count, preview grid,
 * and an optional sample cell substring visible in the table.
 */
async function expectExcelParsePreview(options: {
  page: Page;
  formattedRowCount: string;
  columnNames?: readonly string[];
  sampleCellSubstring: string;
}): Promise<void> {
  await expect(
    options.page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });

  await expect(
    options.page.getByText(
      `These are the first ${options.formattedRowCount} rows`,
      { exact: false },
    ),
  ).toBeVisible({ timeout: LONG_WAIT });

  await expect(
    options.page.getByText(/These are the first \d+ rows/),
  ).toBeVisible({ timeout: MEDIUM_WAIT });

  if (options.columnNames) {
    await Promise.all(
      options.columnNames.map(async (columnName) => {
        await expect(
          options.page.getByRole("columnheader", { name: columnName }),
        ).toBeVisible({ timeout: SHORT_WAIT });
      }),
    );
  }

  await expect(
    options.page.getByText(options.sampleCellSubstring).first(),
  ).toBeVisible({ timeout: SHORT_WAIT });
}

test.describe("Excel manual upload", () => {
  // Runs in its own fresh browser process (see `freshBrowserPage`): the large
  // XLSX (17k+ rows) DuckDB-WASM parse is slow enough that, on an aged shared
  // process late in the run, it can exceed its timeout. A clean process removes
  // that flakiness.
  test("medium-sized XLSX dataset import, cloud sync, offline then online again", async ({
    freshBrowserPage: page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    await page.goto(`/${workspaceSlug}/data-manager/data-import`);

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
      formattedRowCount: formatImportPreviewRowCount(
        CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT,
      ),
      sampleCellSubstring: "Times Square",
    });

    await fileInput.setInputFiles(CALIFORNIA_XLSX_PATH);
    await uploadSubmitButton.click();

    await expectExcelParsePreview({
      page,
      formattedRowCount: formatImportPreviewRowCount(
        CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
      ),
      sampleCellSubstring: "California",
    });

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

    await pollUntilCloudDatasetToggleShowsOnline(page);

    await expect
      .poll(
        async () => {
          return isDatasetParquetInStorage({
            supabaseAdminClient: admin,
            workspaceId,
            datasetId,
          });
        },
        { timeout: LONG_WAIT },
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
            supabaseAdminClient: admin,
            workspaceId,
            datasetId,
          }));
          const offlineToggleVisible = await page
            .getByRole("button", { name: "Allow online syncing" })
            .isVisible();

          return parquetGone && offlineToggleVisible;
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    await page
      .getByRole("button", { name: "Allow online syncing" })
      .first()
      .click();

    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Allow syncing" })
      .click();

    await pollUntilCloudDatasetToggleShowsOnline(page);

    await expect
      .poll(
        async () => {
          return isDatasetParquetInStorage({
            supabaseAdminClient: admin,
            workspaceId,
            datasetId,
          });
        },
        { timeout: LONG_WAIT },
      )
      .toBe(true);

    const syncedToggle = page.getByRole("button", {
      name: "Make offline-only",
    });

    await expect(syncedToggle).toBeVisible({ timeout: SHORT_WAIT });
    await expect(syncedToggle).toBeEnabled({ timeout: SHORT_WAIT });

    await deleteDatasetViaDataManagerUiAndVerify({
      admin,
      datasetId,
      page,
      workspaceId,
      workspaceSlug,
    });
  });
});
