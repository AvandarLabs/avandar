import { formatNumber } from "@avandar/utils";
import { expect } from "@playwright/test";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./manualUploadCloudSyncFlow";
import { MEDIUM_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/** Imports one CSV through the product UI and returns its saved dataset id. */
export async function importDatasetViaUi(
  options: Readonly<{
    page: Page;
    filePath: string;
    expectedRowCount: number;
    workspaceSlug: string;
    onDatasetCreated?: (datasetId: string) => void;
  }>,
): Promise<string> {
  const { page, workspaceSlug } = options;
  await page.getByRole("link", { name: "Data Sources" }).click();
  await page.getByRole("button", { name: "Add new dataset" }).click();
  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(options.filePath);
  const rowCount = formatNumber(options.expectedRowCount, { locale: "en-US" });
  const parsedRowCount = page.getByText(new RegExp(`of ${rowCount}\\. Page`));
  // Choosing the file parses it, so there is nothing to confirm between the
  // two assertions below.
  await expect(page.getByRole("heading", { name: "Data preview" })).toBeVisible(
    { timeout: MEDIUM_WAIT },
  );
  await expect(parsedRowCount).toBeVisible({ timeout: MEDIUM_WAIT });
  await ensureCloudStorageCheckedAndSaveDataset({ page, workspaceSlug });
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  options.onDatasetCreated?.(datasetId);
  await pollUntilCloudDatasetToggleShowsOnline(page);
  return datasetId;
}
