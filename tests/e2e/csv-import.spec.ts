import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  EXPECTED_CSV_COLUMN_NAMES,
  SMALL_CALIFORNIA_CSV_PATH,
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

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

async function _uploadCsvAndAssertPreview(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
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
  await Promise.all(
    EXPECTED_CSV_COLUMN_NAMES.map(async (columnName) => {
      await expect(
        page.getByRole("columnheader", { name: columnName }),
      ).toBeVisible({ timeout: SHORT_WAIT });
    }),
  );
  await expect(page.getByText("California").first()).toBeVisible({
    timeout: SHORT_WAIT,
  });
}

function _getDatasetIdFromPage(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): string {
  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: options.page.url(),
    workspaceSlug: options.workspaceSlug,
  });
  if (datasetId === undefined) {
    throw new Error(
      `Could not parse dataset id from URL: ${options.page.url()}`,
    );
  }
  return datasetId;
}

async function _assertParquetStorage(
  options: Readonly<{
    admin: AdminClient;
    datasetId: string;
    isStored: boolean;
    workspaceId: string;
  }>,
): Promise<void> {
  await expect
    .poll(
      async () => {
        return isDatasetParquetInStorage({
          supabaseAdminClient: options.admin,
          workspaceId: options.workspaceId,
          datasetId: options.datasetId,
        });
      },
      { timeout: LONG_WAIT },
    )
    .toBe(options.isStored);
}

async function _makeDatasetOffline(
  options: Readonly<{
    admin: AdminClient;
    datasetId: string;
    page: Page;
    workspaceId: string;
  }>,
): Promise<void> {
  const { admin, datasetId, page, workspaceId } = options;
  await page.getByRole("button", { name: "Make offline-only" }).first().click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Make offline-only" })
    .click();
  await expect
    .poll(
      async () => {
        const isParquetGone = !(await isDatasetParquetInStorage({
          supabaseAdminClient: admin,
          workspaceId,
          datasetId,
        }));
        const isOfflineToggleVisible = await page
          .getByRole("button", { name: "Allow online syncing" })
          .isVisible();
        return isParquetGone && isOfflineToggleVisible;
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
}

async function _makeDatasetOnline(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Allow online syncing" })
    .first()
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Allow syncing" })
    .click();
  await pollUntilCloudDatasetToggleShowsOnline(page);
  const syncedToggle = page.getByRole("button", { name: "Make offline-only" });
  await expect(syncedToggle).toBeVisible({ timeout: SHORT_WAIT });
  await expect(syncedToggle).toBeEnabled({ timeout: SHORT_WAIT });
}

test.describe("CSV manual upload", () => {
  test("uploads a CSV dataset, verifies preview, offline/online cycle, parquet, toggle", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    const { workspaceSlug } = e2eWorkerDb;

    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug,
    });

    await _uploadCsvAndAssertPreview({ page, workspaceSlug });
    await ensureCloudStorageCheckedAndSaveDataset({
      page,
      workspaceSlug,
    });
    const datasetId = _getDatasetIdFromPage({ page, workspaceSlug });
    const workspaceId = await getWorkspaceIdBySlug({
      supabaseAdminClient: admin,
      slug: workspaceSlug,
    });
    await pollUntilCloudDatasetToggleShowsOnline(page);
    await _assertParquetStorage({
      admin,
      datasetId,
      isStored: true,
      workspaceId,
    });
    await _makeDatasetOffline({ admin, datasetId, page, workspaceId });
    await _makeDatasetOnline(page);
    await _assertParquetStorage({
      admin,
      datasetId,
      isStored: true,
      workspaceId,
    });
    await deleteDatasetViaDataManagerUiAndVerify({
      admin,
      datasetId,
      page,
      workspaceId,
      workspaceSlug,
    });
  });
});
