import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
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

const SEEDED_SQL = "SELECT 1 AS mocked_column LIMIT 20";

async function _goToDataExplorerWithSeededSQL(options: {
  page: import("@playwright/test").Page;
  workspaceSlug: string;
}): Promise<void> {
  const url = `/${options.workspaceSlug}/data-explorer?sql=${encodeURIComponent(
    SEEDED_SQL,
  )}`;
  await options.page.goto(url);
  await dismissBlockingOverlays(options.page);
  await expect(
    options.page.getByRole("columnheader", { name: /mocked_column/i }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

async function _openQueryTab(
  page: import("@playwright/test").Page,
): Promise<void> {
  // The drawer's tab rail is always mounted, and clicking a tab also expands
  // the drawer when it happens to be collapsed.
  await page.getByRole("tab", { name: /^query$/i }).click();
  await expect(page.getByRole("tabpanel", { name: /^query$/i })).toBeVisible({
    timeout: SHORT_WAIT,
  });
}

test.describe("Data Explorer query drawer", () => {
  test("opening query details does not replace the current SQL or URL", async ({
    page,
    e2eWorkerDb,
  }) => {
    await signInWithEmailPassword(page, {
      email: e2eWorkerDb.primaryUser.email,
      password: e2eWorkerDb.primaryUser.password,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    await _goToDataExplorerWithSeededSQL({
      page,
      workspaceSlug: e2eWorkerDb.workspaceSlug,
    });

    const beforeUrl = page.url();

    await _openQueryTab(page);

    await expect
      .poll(() => {
        return page.url();
      })
      .toBe(beforeUrl);

    await page.getByRole("radio", { name: /^sql$/i }).click();
    await expect(
      page.getByRole("tabpanel", { name: /^query$/i }).getByRole("code"),
    ).toContainText(/SELECT 1 AS [`"]?mocked_column[`"]? LIMIT 20/, {
      timeout: SHORT_WAIT,
    });
  });

  test("first visit opens the drawer on Query with the manual form and shows available datasets in the datasource dropdown", async ({
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
    // Skip cloud-sync polling: the data explorer reads the local parquet
    // immediately after save. Waiting for upload would exceed the 45s budget
    // when this file runs after other heavy specs in the same worker.

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

    try {
      // Navigate to the Data Explorer client-side (via the sidebar link)
      // rather than a hard `page.goto`. A full reload rehydrates React Query
      // from the throttled IndexedDB persister, which can still hold a stale,
      // empty workspace-datasets list (the dataset we just saved may not be
      // flushed yet). That list is `staleTime`-fresh so it is not refetched,
      // leaving the datasource dropdown permanently disabled. A client-side
      // navigation keeps the in-memory cache (with the dataset) intact.
      await page
        .getByRole("link", { name: "Data Explorer", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/${workspaceSlug}/data-explorer`),
        { timeout: MEDIUM_WAIT },
      );
      await dismissBlockingOverlays(page);

      const queryPanel = page.getByRole("tabpanel", { name: /^query$/i });
      await expect(queryPanel).toBeVisible({ timeout: SHORT_WAIT });
      await expect(page.getByRole("tab", { name: /^query$/i })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.getByRole("radio", { name: /^manual$/i })).toBeChecked();

      const dataSourceInput = queryPanel.getByLabel("Data source");
      await dataSourceInput.click();

      await expect(
        page.getByRole("option", { name: "small-california-covid-sample.csv" }),
      ).toBeVisible({ timeout: SHORT_WAIT });
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
