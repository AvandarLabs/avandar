import { randomUUID as randomUuid } from "node:crypto";
import { assert } from "@avandar/utils";
import { TEST_XLSX_PATH } from "../data/multi-sheet-regions/makeTestXlsxData";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  dismissBlockingOverlays,
  openDataExplorerDrawerTab,
} from "./helpers/dataExplorerFlow";
import { deleteDatasetAndShares } from "./helpers/datasetSharingCleanup";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getDatasetParquetObjectPath,
  getWorkspaceIdBySlug,
  WORKSPACES_STORAGE_BUCKET,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT } from "./helpers/timeouts";
import { E2E_ONLINE_TAG } from "./setup/ensureE2EViteFeatureFlags/ensureE2EViteFeatureFlags";
import type { Page } from "@playwright/test";

/** Selects the second sheet through the same parse controls a user sees. */
async function _uploadSecondSheet(page: Page): Promise<void> {
  await page
    .getByRole("tabpanel", { name: "Upload" })
    .locator('input[type="file"]')
    .setInputFiles(TEST_XLSX_PATH);
  const sheet = page.getByRole("combobox", { name: "Sheet name", exact: true });
  await expect(sheet).toHaveValue("North", { timeout: MEDIUM_WAIT });
  await expect(
    page.getByRole("gridcell", { name: "Northport", exact: true }),
  ).toBeVisible();
  await sheet.click();
  await expect(page.getByRole("option")).toHaveText(["North", "South", "West"]);
  await page.getByRole("option", { name: "South", exact: true }).click();
  await page.getByRole("button", { name: "Process data again" }).click();
  await expect(sheet).toHaveValue("South");
  await expect(
    page.getByRole("gridcell", { name: "Southbank", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: ".temp/test-xlsx-multi-sheet/second-sheet-preview.png",
  });
}

/** Builds an initial query so the saved dataset is available in the editor. */
async function _openSavedDataset(
  options: Readonly<{ page: Page; datasetName: string }>,
): Promise<void> {
  const { page, datasetName } = options;
  await page.getByRole("link", { name: "Data Explorer", exact: true }).click();
  await dismissBlockingOverlays(page);
  await openDataExplorerDrawerTab({ page, tab: "query" });
  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  await queryPanel
    .getByRole("combobox", { name: "Data source", exact: true })
    .click();
  await page.getByRole("option", { name: datasetName, exact: true }).click();
  await queryPanel.getByPlaceholder("Select columns to query").fill("city");
  await page.getByRole("option", { name: "city", exact: true }).click();
  await page.keyboard.press("Escape");
}

/** Runs an ordered query through Data Explorer's SQL editor. */
async function _querySavedDataset(
  options: Readonly<{ page: Page; datasetId: string; datasetName: string }>,
): Promise<void> {
  const { page, datasetId } = options;
  await _openSavedDataset(options);
  const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
  await page
    .getByRole("radiogroup", { name: "Query editor mode" })
    .getByText("SQL", { exact: true })
    .click();
  await queryPanel.getByRole("button", { name: "Edit query" }).click();
  await queryPanel
    .getByRole("textbox")
    .fill(
      `SELECT city, CAST(cases AS INTEGER) AS imported_cases FROM "${datasetId}" ORDER BY city`,
    );
  await queryPanel.getByRole("button", { name: "Re-run query" }).click();
  await expect(
    page.getByRole("columnheader", { name: "imported_cases", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("gridcell")).toHaveText([
    "Southbank",
    "202.00",
    "Southfield",
    "203.00",
  ]);
  await page.screenshot({
    path: ".temp/test-xlsx-multi-sheet/second-sheet-query.png",
  });
}

/** Removes only this test's saved dataset, shares, and cloud Parquet file. */
async function _deleteImportedDataset(
  options: Readonly<{ workspaceSlug: string; datasetName: string }>,
): Promise<void> {
  const supabaseAdminClient = createSupabaseAdminClient();
  const workspaceId = await getWorkspaceIdBySlug({
    supabaseAdminClient,
    slug: options.workspaceSlug,
  });
  // Look up the unique name even when save failed before returning its URL.
  const { data: dataset } = await supabaseAdminClient
    .from("datasets")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", options.datasetName)
    .maybeSingle()
    .throwOnError();
  if (dataset) {
    await deleteDatasetAndShares({
      supabaseAdminClient,
      datasetId: dataset.id,
    });
    const { data: remainingDataset } = await supabaseAdminClient
      .from("datasets")
      .select("id")
      .eq("id", dataset.id)
      .maybeSingle()
      .throwOnError();
    assert(!remainingDataset, "Test dataset cleanup failed");
    const { error } = await supabaseAdminClient.storage
      .from(WORKSPACES_STORAGE_BUCKET)
      .remove([
        getDatasetParquetObjectPath({ workspaceId, datasetId: dataset.id }),
      ]);
    assert(!error, error?.message);
  }
}

test(
  "Data Explorer returns only the second sheet's rows after saving a three-sheet XLSX",
  { tag: E2E_ONLINE_TAG },
  async ({ page, e2eWorkerDb }) => {
    const { workspaceSlug, primaryUser } = e2eWorkerDb;
    const datasetName = `multi-sheet-regions-${randomUuid()}`;
    try {
      await signInWithEmailPassword(page, { ...primaryUser, workspaceSlug });
      await page.goto(`/${workspaceSlug}/data-manager/data-import`);
      await _uploadSecondSheet(page);
      await page
        .getByRole("textbox", { name: "Dataset name", exact: true })
        .fill(datasetName);
      await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
      const datasetId = parseDatasetIdFromDataManagerUrl({
        url: page.url(),
        workspaceSlug,
      });
      assert(datasetId, `Could not parse dataset id from URL: ${page.url()}`);
      await pollUntilCloudDatasetToggleShowsOnline(page);
      await _querySavedDataset({ page, datasetId, datasetName });
    } finally {
      await page.close();
      await _deleteImportedDataset({ workspaceSlug, datasetName });
    }
  },
);
