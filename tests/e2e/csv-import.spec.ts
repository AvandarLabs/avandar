import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  EXPECTED_CSV_COLUMN_NAMES,
  formatImportPreviewRowCount,
  SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
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
import { LONG_WAIT, SHORT_WAIT } from "./helpers/timeouts";

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

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: LONG_WAIT });

    const formattedPreviewRowCount = formatImportPreviewRowCount(
      SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
    );
    await expect(
      page.getByText(`These are the first ${formattedPreviewRowCount} rows`, {
        exact: false,
      }),
    ).toBeVisible({ timeout: LONG_WAIT });

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
