import { expect } from "@playwright/test";
import { runSqlOverDataset } from "../dataExplorerFlow";
import { openShareModal, setGeneralAccess } from "../shareModalFlow";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "../timeouts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { ImportedLiveDataset } from "./LiveConnectorE2e.types";
import type { Page } from "@playwright/test";

/** The buckets a published dashboard's dataset snapshots are written to. */
const SNAPSHOT_BUCKETS = ["published", "published-private"] as const;

/** How much of a dataset a publish uploads, by its radio's label. */
type PublishSliceLabel = "Whole dataset" | "Only what's queried (recommended)";

/**
 * Queries the dataset in the Data Explorer and saves the result as the only
 * widget of a new dashboard, the way a user builds their first one. The
 * owner must have no dashboards yet, so the save opens in create mode.
 */
async function saveQueryToNewDashboard(
  options: Readonly<{
    page: Page;
    dataset: ImportedLiveDataset;
    dashboardName: string;
    sql: string;
    firstColumnName: string;
    expectedCellText: string;
  }>,
): Promise<void> {
  const { page, dashboardName } = options;
  await runSqlOverDataset({
    page,
    datasetName: options.dataset.datasetName,
    columnName: options.firstColumnName,
    sql: options.sql,
  });
  await expect(
    page.getByRole("gridcell", { name: options.expectedCellText }).first(),
  ).toBeVisible({ timeout: LONG_WAIT });

  await page.getByRole("button", { name: /^save$/i }).click();
  await page.getByRole("menuitem", { name: /save to dashboard/i }).click();
  await page.getByLabel(/dashboard name/i).fill(dashboardName);
  await page.getByRole("button", { name: /create dashboard & save/i }).click();
  await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
    timeout: LONG_WAIT,
  });
}

/**
 * Opens a dashboard's editor from the Dashboards page.
 *
 * @returns The dashboard's id, read from the editor's URL.
 */
async function openDashboardEditor(
  options: Readonly<{ page: Page; dashboardName: string }>,
): Promise<string> {
  const { page, dashboardName } = options;
  await page.getByRole("link", { name: "Dashboards", exact: true }).click();
  await page
    .locator(".mantine-Card-root")
    .filter({ hasText: dashboardName })
    .click();
  await expect(page).toHaveURL(/\/dashboards\/edit\/[0-9a-f-]{36}/i, {
    timeout: LONG_WAIT,
  });
  const dashboardId = page
    .url()
    .match(/dashboards\/edit\/([0-9a-f-]{36})/i)?.[1];
  if (!dashboardId) {
    throw new Error(`Could not parse dashboard id from URL: ${page.url()}`);
  }
  return dashboardId;
}

/**
 * Publishes the open dashboard to the workspace through the share modal,
 * uploading the dataset's rows the way `sliceLabel` names.
 */
async function publishToWorkspace(
  options: Readonly<{
    page: Page;
    dataset: ImportedLiveDataset;
    sliceLabel: PublishSliceLabel;
  }>,
): Promise<void> {
  const { page } = options;
  await openShareModal(page);
  await setGeneralAccess(page, "Workspace", "viewer");

  const dialog = page.getByRole("dialog", { name: /^Share / });
  await dialog.getByRole("button", { name: "Advanced options" }).click();
  await dialog
    .getByRole("button", { name: options.dataset.datasetName })
    .click();
  const sliceRadio = dialog.getByRole("radio", { name: options.sliceLabel });
  await sliceRadio.check();
  await expect(sliceRadio).toBeChecked({ timeout: SHORT_WAIT });

  await dialog.getByRole("button", { name: "Publish to workspace" }).click();
  await expect(dialog).toContainText(
    "This dashboard is published to your workspace",
    { timeout: LONG_WAIT },
  );
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * Deletes every snapshot file a published dashboard uploaded. Deleting the
 * dashboard row leaves them behind, since storage has no foreign key to
 * cascade from.
 */
async function removePublishedSnapshots(
  options: Readonly<{ admin: AvaSupabaseDBClient; dashboardId: string }>,
): Promise<void> {
  const { admin, dashboardId } = options;
  const revisionsFolder = `dashboards/${dashboardId}/revisions`;
  for (const bucket of SNAPSHOT_BUCKETS) {
    const { data: revisions } = await admin.storage
      .from(bucket)
      .list(revisionsFolder);
    for (const revision of revisions ?? []) {
      const datasetsFolder = `${revisionsFolder}/${revision.name}/datasets`;
      const { data: files } = await admin.storage
        .from(bucket)
        .list(datasetsFolder);
      const filePaths = (files ?? []).map((file) => {
        return `${datasetsFolder}/${file.name}`;
      });
      if (filePaths.length > 0) {
        await admin.storage.from(bucket).remove(filePaths);
      }
    }
  }
}

/**
 * Builds and publishes a dashboard over a live dataset through the UI, and
 * cleans up what publishing uploaded.
 */
export const LiveDatasetDashboardFlow = {
  saveQueryToNewDashboard,
  openDashboardEditor,
  publishToWorkspace,
  removePublishedSnapshots,
};
