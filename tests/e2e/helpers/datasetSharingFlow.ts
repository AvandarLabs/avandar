import { expect } from "@playwright/test";
import { CALIFORNIA_CSV_PATH } from "./constants";
import {
  addShareV2,
  closeShareModalV2,
  openShareModalV2,
  setGeneralAccessV2,
} from "./datasetSharingFlowV2";
import { ensureCloudStorageCheckedAndSaveDataset } from "./manualUploadCloudSyncFlow";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * Uploads the California CSV sample, sets the dataset name, saves, and returns
 * the dataset meta page URL segment id from the current URL.
 */
export async function uploadCaliforniaCsvDataset(options: {
  page: Page;
  workspaceSlug: string;
  datasetName: string;
}): Promise<{ datasetId: string }> {
  const { page, workspaceSlug, datasetName } = options;

  await page.goto(`/${workspaceSlug}/data-manager/data-import`);

  const uploadPanel = page.getByRole("tabpanel", { name: "Upload" });
  await uploadPanel
    .locator('input[type="file"]')
    .setInputFiles(CALIFORNIA_CSV_PATH);
  await uploadPanel
    .getByRole("button", { name: "Upload", exact: true })
    .click();

  await expect(
    page.getByText("Data processed successfully", { exact: false }),
  ).toBeVisible({ timeout: LONG_WAIT });

  await page.getByLabel("Dataset name").fill(datasetName);

  await ensureCloudStorageCheckedAndSaveDataset({
    page,
    workspaceSlug,
  });

  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = page
    .url()
    .match(new RegExp(`/${escaped}/data-manager/([0-9a-f-]{36})`, "i"));
  const datasetId = match?.[1];
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }

  return { datasetId };
}

/**
 * Configures a dataset as restricted with no workspace-wide access.
 * Composite helper: open modal -> set General access to Restricted -> close.
 */
export async function restrictDatasetWithNoWorkspaceAccess(
  page: Page,
): Promise<void> {
  await openShareModalV2(page);
  await setGeneralAccessV2(page, "Restricted");
  await closeShareModalV2(page);
}

/**
 * Asserts the dataset link is absent from the data-manager sidebar.
 */
export async function expectDatasetHiddenInDataManager(
  page: Page,
  options: { workspaceSlug: string; datasetName: string },
): Promise<void> {
  await page.goto(`/${options.workspaceSlug}/data-manager`);
  await expect(
    page.getByRole("link", { name: options.datasetName }),
  ).toHaveCount(0, { timeout: LONG_WAIT });
}

/**
 * Asserts the dataset link is visible in the data-manager sidebar.
 */
export async function expectDatasetVisibleInDataManager(
  page: Page,
  options: { workspaceSlug: string; datasetName: string },
): Promise<void> {
  await page.goto(`/${options.workspaceSlug}/data-manager`);
  await expect(
    page.getByRole("link", { name: options.datasetName }),
  ).toBeVisible({
    timeout: LONG_WAIT,
  });
}

/**
 * Direct navigation: restricted users should not load dataset metadata.
 */
export async function expectDatasetMetaPageDenied(
  page: Page,
  options: { workspaceSlug: string; datasetId: string },
): Promise<void> {
  await page.goto(
    `/${options.workspaceSlug}/data-manager/${options.datasetId}`,
  );
  // Two denial paths exist:
  // 1. The user has data_sources app access but the dataset RLS denies →
  //    `Dataset failed to load` / `Not Found` on the dataset meta view.
  // 2. The user does NOT have data_sources app access at all → the
  //    route guard short-circuits before the dataset query and renders
  //    the "Access denied" page.
  await expect(
    page.getByText(/Dataset failed to load|Not Found|Access denied/i).first(),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/**
 * Direct navigation: user can open dataset metadata.
 */
export async function expectDatasetMetaPageAccessible(
  page: Page,
  options: {
    workspaceSlug: string;
    datasetId: string;
    datasetName: string;
  },
): Promise<void> {
  await page.goto(
    `/${options.workspaceSlug}/data-manager/${options.datasetId}`,
  );
  await expect(
    page.getByRole("paragraph").filter({ hasText: options.datasetName }),
  ).toBeVisible({
    timeout: LONG_WAIT,
  });
}

/**
 * Opens share modal, adds a direct principal share, and closes the modal.
 * Composite helper: delegates to the v2 helpers for the actual modal driving.
 */
export async function shareDatasetWithPrincipal(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  await openShareModalV2(options.page);
  await addShareV2(options);
  await closeShareModalV2(options.page);
}

/** Display name seeded for the secondary E2E viewer membership. */
export const E2E_SECONDARY_MEMBER_DISPLAY_NAME = "E2E Viewer";
