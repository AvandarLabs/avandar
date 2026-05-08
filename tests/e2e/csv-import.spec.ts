import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
  isDatasetParquetInStorage,
} from "../helper/supabaseAdminClient";
import { expect, test } from "./fixtures/e2eTestWorkspace.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import {
  CALIFORNIA_CSV_EXPECTED_ROW_COUNT,
  CALIFORNIA_CSV_PATH,
  E2E_SEEDED_WORKSPACE_SLUG,
  E2E_TEST_USER,
  EXPECTED_CSV_COLUMN_NAMES,
} from "./helpers/constants";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";

test.describe("CSV manual upload", () => {
  test("parses the California COVID sample with DuckDB WASM preview", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await signInWithEmailPassword(page, {
      email: E2E_TEST_USER.email,
      password: E2E_TEST_USER.password,
    });

    await page.goto(`/${E2E_SEEDED_WORKSPACE_SLUG}/data-manager/data-import`);

    const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(CALIFORNIA_CSV_PATH);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: 120_000 });

    const formattedRowCount =
      CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
    await expect(
      page.getByText(`Parsed ${formattedRowCount} rows successfully`),
    ).toBeVisible();

    await expect(page.getByText(/These are the first \d+ rows/)).toBeVisible();

    for (const columnName of EXPECTED_CSV_COLUMN_NAMES) {
      await expect(
        page.getByRole("columnheader", { name: columnName }),
      ).toBeVisible();
    }

    await expect(page.getByText("California").first()).toBeVisible();
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
    await uploadPanel
      .locator('input[type="file"]')
      .setInputFiles(CALIFORNIA_CSV_PATH);

    await uploadPanel
      .getByRole("button", { name: "Upload", exact: true })
      .click();

    const formattedRowCount =
      CALIFORNIA_CSV_EXPECTED_ROW_COUNT.toLocaleString("en-US");
    await expect(
      page.getByText("Data processed successfully", { exact: false }),
    ).toBeVisible({ timeout: 120_000 });

    await expect(
      page.getByText(`Parsed ${formattedRowCount} rows successfully`),
    ).toBeVisible();

    for (const columnName of EXPECTED_CSV_COLUMN_NAMES) {
      await expect(
        page.getByRole("columnheader", { name: columnName }),
      ).toBeVisible();
    }

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
