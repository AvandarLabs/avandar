import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { SMALL_CALIFORNIA_CSV_PATH } from "./helpers/constants";
import { dismissBlockingOverlays } from "./helpers/dataExplorerFlow";
import { deleteDatasetViaDataManagerUiAndVerify } from "./helpers/deleteDatasetViaDataManagerUi";
import {
  ensureCloudStorageCheckedAndSaveDataset,
  parseDatasetIdFromDataManagerUrl,
  pollUntilCloudDatasetToggleShowsOnline,
} from "./helpers/manualUploadCloudSyncFlow";
import {
  createSupabaseAdminClient,
  getWorkspaceIdBySlug,
} from "./helpers/supabaseAdminClient";
import { MEDIUM_WAIT, SHORT_WAIT } from "./helpers/timeouts";

const SEEDED_SQL = "SELECT 1 AS mocked_column LIMIT 20";
const PANEL_PREFERENCES_STORAGE_KEY = "ava.data-explorer.panel-preferences";

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

async function _ensureQueryPanelOpen(
  page: import("@playwright/test").Page,
): Promise<void> {
  const queryDetailsPanel = page.locator('div[aria-label="Query Details"]');
  if (await queryDetailsPanel.isVisible()) {
    return;
  }

  await page.getByRole("button", { name: /^query$/i }).click();
  await expect(queryDetailsPanel).toBeVisible({ timeout: SHORT_WAIT });
}

test.describe("Data Explorer query details", () => {
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

    await _ensureQueryPanelOpen(page);

    await expect
      .poll(() => {
        return page.url();
      })
      .toBe(beforeUrl);

    await page.getByRole("tab", { name: /^sql$/i }).click();
    await expect(page.locator("textarea[readonly]").first()).toHaveValue(
      SEEDED_SQL,
      { timeout: SHORT_WAIT },
    );
  });

  test("query panels remember their last position and collapsed state", async ({
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

    const queryDetailsPanel = page.locator('div[aria-label="Query Details"]');
    await _ensureQueryPanelOpen(page);

    const initialBox = await queryDetailsPanel.boundingBox();
    expect(initialBox).not.toBeNull();
    if (!initialBox) {
      return;
    }

    await queryDetailsPanel.getByLabel("Collapse panel").click();
    await queryDetailsPanel
      .getByLabel("Close Query Details")
      .evaluate((node) => {
        (node as { click: () => void }).click();
      });

    await _ensureQueryPanelOpen(page);
    await expect(queryDetailsPanel.getByLabel("Expand panel")).toBeVisible({
      timeout: SHORT_WAIT,
    });

    const reopenedBox = await queryDetailsPanel.boundingBox();
    expect(reopenedBox).not.toBeNull();
    if (!reopenedBox) {
      return;
    }
    expect(Math.abs(reopenedBox.x - initialBox.x)).toBeLessThan(24);

    await queryDetailsPanel
      .getByLabel("Close Query Details")
      .evaluate((node) => {
        (node as { click: () => void }).click();
      });

    await page.evaluate(
      ({ storageKey }) => {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            queryDetails: {
              collapsed: true,
              position: {
                left: 220,
                top: 240,
              },
            },
            settings: {
              collapsed: true,
              position: {
                left: 680,
                top: 180,
              },
            },
          }),
        );
      },
      { storageKey: PANEL_PREFERENCES_STORAGE_KEY },
    );

    await page.reload();
    await dismissBlockingOverlays(page);
    await expect(
      page.getByRole("columnheader", { name: /mocked_column/i }),
    ).toBeVisible({ timeout: MEDIUM_WAIT });

    await _ensureQueryPanelOpen(page);
    await expect(queryDetailsPanel.getByLabel("Expand panel")).toBeVisible({
      timeout: SHORT_WAIT,
    });
    const reloadedQueryDetailsBox = await queryDetailsPanel.boundingBox();
    expect(reloadedQueryDetailsBox).not.toBeNull();
    if (!reloadedQueryDetailsBox) {
      return;
    }
    expect(reloadedQueryDetailsBox.x).toBeGreaterThan(200);

    await page.getByRole("button", { name: /^settings$/i }).click();
    const settingsPanel = page.locator(
      'div[aria-label="Visualization Settings"]',
    );
    await expect(settingsPanel.getByLabel("Expand panel")).toBeVisible({
      timeout: SHORT_WAIT,
    });
    const reloadedSettingsBox = await settingsPanel.boundingBox();
    expect(reloadedSettingsBox).not.toBeNull();
    if (!reloadedSettingsBox) {
      return;
    }
    expect(reloadedSettingsBox.x).toBeGreaterThan(640);
  });

  test("first visit opens Query on the manual form and shows available datasets in the datasource dropdown", async ({
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
    });
    await pollUntilCloudDatasetToggleShowsOnline(page);

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
      await page.evaluate(
        ({ storageKey }) => {
          window.localStorage.removeItem(storageKey);
        },
        { storageKey: PANEL_PREFERENCES_STORAGE_KEY },
      );

      await page.goto(`/${workspaceSlug}/data-explorer`);
      await dismissBlockingOverlays(page);

      const queryDetailsPanel = page.locator('div[aria-label="Query Details"]');
      await expect(queryDetailsPanel).toBeVisible({ timeout: SHORT_WAIT });
      await expect(
        page.getByRole("tab", { name: /^manual query$/i }),
      ).toHaveAttribute("aria-selected", "true");

      const dataSourceInput = page.getByLabel("Data source");
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
