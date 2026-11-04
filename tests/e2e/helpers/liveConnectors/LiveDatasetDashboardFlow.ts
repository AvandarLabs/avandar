import { assertIsDefined, promiseFlatMap, promiseMap } from "@avandar/utils";
import { expect } from "@playwright/test";
import { getUserIdByEmail } from "../../setup/e2eTestWorkspaceLifecycle";
import { runSqlOverDataset } from "../dataExplorerFlow";
import { parseDashboardIdFromEditorUrl } from "../parseDashboardIdFromEditorUrl";
import { deleteAllDashboardsForOwner } from "../seedDashboard";
import { openShareModal, setGeneralAccess } from "../shareModalFlow";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "../timeouts";
import { LiveDatasetPageFlow } from "./LiveDatasetPageFlow";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";
import type { SavedDataset } from "../saveCloudOnlyDataset";
import type { LiveConnectorSession } from "./LiveConnectorE2e.types";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { Page } from "@playwright/test";

/** How much of a dataset a publish uploads: every column, or the queried. */
export type PublishedSliceMode = Extract<
  PublishSliceConfig.T["mode"],
  "all_columns" | "queried"
>;

/** The share modal's radio label for each slice mode. */
const SLICE_LABEL_BY_MODE: Record<PublishedSliceMode, string> = {
  all_columns: "Whole dataset",
  queried: "Only what's queried (recommended)",
};

async function _saveDatasetToNewDashboard(
  options: Readonly<{
    page: Page;
    dataset: SavedDataset;
    dashboardName: string;
  }>,
): Promise<void> {
  const { page, dataset, dashboardName } = options;
  await runSqlOverDataset({
    page,
    datasetName: dataset.datasetName,
    columnName: "region",
    sql: `SELECT region, cases FROM "${dataset.datasetId}" ORDER BY region`,
  });
  await expect(
    page.getByRole("gridcell", { name: "Highlands", exact: true }),
  ).toBeVisible({ timeout: LONG_WAIT });

  await page.getByRole("button", { name: /^save$/i }).click();
  await page.getByRole("menuitem", { name: /save to dashboard/i }).click();
  await page.getByLabel(/dashboard name/i).fill(dashboardName);
  await page.getByRole("button", { name: /create dashboard & save/i }).click();
  await expect(page.getByText(`Created "${dashboardName}"`)).toBeVisible({
    timeout: LONG_WAIT,
  });
}

async function _openDashboardEditor(
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
  const dashboardId = parseDashboardIdFromEditorUrl(page.url());
  assertIsDefined(
    dashboardId,
    `Could not parse dashboard id from ${page.url()}`,
  );
  return dashboardId;
}

async function _publishToWorkspace(
  options: Readonly<{
    page: Page;
    dataset: SavedDataset;
    sliceMode: PublishedSliceMode;
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
  const sliceRadio = dialog.getByRole("radio", {
    name: SLICE_LABEL_BY_MODE[options.sliceMode],
  });
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

async function _expectLinkShowsPublishedRows(
  options: Readonly<{
    page: Page;
    session: LiveConnectorSession;
    workspaceSlug: string;
    dashboardId: string;
  }>,
): Promise<void> {
  const { page, session } = options;
  const readCountBeforeVisit = session.getDatasetReadUrls().length;
  await page.goto(`/${options.workspaceSlug}/d/${options.dashboardId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("gridcell", { name: "Highlands", exact: true }),
  ).toBeVisible({ timeout: LONG_WAIT });
  await expect(
    LiveDatasetPageFlow.getWholeNumberCell({ page, value: 450 }),
  ).toBeVisible();
  await expect(
    LiveDatasetPageFlow.getWholeNumberCell({ page, value: 999 }),
  ).toHaveCount(0);
  expect(session.getDatasetReadUrls()).toHaveLength(readCountBeforeVisit);
}

/** Every snapshot file a published dashboard uploaded to `bucket`. */
async function _getSnapshotFilePaths(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    bucket: string;
    dashboardId: string;
  }>,
): Promise<string[]> {
  const storage = options.supabaseAdminClient.storage.from(options.bucket);
  const revisionsFolder = `dashboards/${options.dashboardId}/revisions`;
  const { data: revisions } = await storage.list(revisionsFolder);
  return await promiseFlatMap(revisions ?? [], async (revision) => {
    const datasetsFolder = `${revisionsFolder}/${revision.name}/datasets`;
    const { data: files } = await storage.list(datasetsFolder);
    return (files ?? []).map((file) => {
      return `${datasetsFolder}/${file.name}`;
    });
  });
}

/**
 * Deletes a dashboard's snapshot files and its shares, which deleting its
 * row leaves behind: storage and `resource_shares.resource_id` have no
 * foreign key to cascade from.
 */
async function _deleteDashboardLeftovers(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    dashboardId: string;
  }>,
): Promise<void> {
  const { supabaseAdminClient, dashboardId } = options;
  await promiseMap(["published", "published-private"], async (bucket) => {
    const filePaths = await _getSnapshotFilePaths({
      supabaseAdminClient,
      bucket,
      dashboardId,
    });
    if (filePaths.length > 0) {
      await supabaseAdminClient.storage.from(bucket).remove(filePaths);
    }
  });
  await supabaseAdminClient
    .from("resource_shares")
    .delete()
    .eq("resource_type", "dashboard")
    .eq("resource_id", dashboardId);
}

async function _deleteOwnerDashboards(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
    ownerEmail: string;
  }>,
): Promise<void> {
  const { supabaseAdminClient, workspaceId } = options;
  const ownerId = await getUserIdByEmail({
    supabaseAdminClient,
    email: options.ownerEmail,
  });
  const { data: dashboards } = await supabaseAdminClient
    .from("dashboards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("owner_id", ownerId);
  await promiseMap(dashboards ?? [], (dashboard) => {
    return _deleteDashboardLeftovers({
      supabaseAdminClient,
      dashboardId: dashboard.id,
    });
  });
  await deleteAllDashboardsForOwner({
    admin: supabaseAdminClient,
    workspaceId,
    ownerEmail: options.ownerEmail,
  });
}

/**
 * Builds and publishes a dashboard over a live dataset through the UI, reads
 * it back, and cleans up what that created.
 */
export const LiveDatasetDashboardFlow = {
  /**
   * Queries the dataset's regions and cases in the Data Explorer and saves
   * the result as the only widget of a new dashboard, the way a user builds
   * their first one. The owner must have no dashboards yet, so the save
   * opens in create mode.
   */
  saveDatasetToNewDashboard: _saveDatasetToNewDashboard,

  /**
   * Opens a dashboard's editor from the Dashboards page.
   *
   * @returns The dashboard's id, read from the editor's URL.
   */
  openDashboardEditor: _openDashboardEditor,

  /** Asserts the open editor's widget renders the dataset's rows. */
  expectEditorWidgetShowsRows: async (page: Page): Promise<void> => {
    await expect(async () => {
      const editorFrame = page.locator("iframe").first().contentFrame();
      await expect(
        editorFrame.getByRole("gridcell", { name: "Highlands", exact: true }),
      ).toBeVisible({ timeout: MEDIUM_WAIT });
    }).toPass({ timeout: LONG_WAIT });
  },

  /**
   * Publishes the open dashboard to the workspace through the share modal,
   * uploading the dataset's rows as `sliceMode` says.
   */
  publishToWorkspace: _publishToWorkspace,

  /**
   * Opens a published dashboard's link and asserts it shows the rows the
   * source held when it was published, read from the uploaded snapshot:
   * nothing reaches the source's dataset route during the visit.
   */
  expectLinkShowsPublishedRows: _expectLinkShowsPublishedRows,

  /**
   * Deletes every dashboard the owner has in the workspace, with the
   * snapshot files and shares publishing one created.
   */
  deleteOwnerDashboards: _deleteOwnerDashboards,
};
