import { expect } from "@playwright/test";
import { CALIFORNIA_CSV_PATH } from "./constants";
import { ensureCloudStorageCheckedAndSaveDataset } from "./manualUploadCloudSyncFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./timeouts";
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
 * Opens the Share modal from the dataset metadata page.
 */
export async function openDatasetShareModal(page: Page): Promise<void> {
  const shareButton = page.getByRole("button", { name: "Share" });
  await expect(shareButton).toBeEnabled({ timeout: LONG_WAIT });
  await shareButton.click();
  await expect(page.getByText("Workspace access")).toBeVisible({
    timeout: LONG_WAIT,
  });
}

/**
 * Sets the restricted-access switch on the share modal.
 */
export async function setShareModalRestricted(
  page: Page,
  isRestricted: boolean,
): Promise<void> {
  const restrictSwitch = page.getByRole("switch", {
    name: /Restrict access/i,
  });
  const isChecked = await restrictSwitch.isChecked();
  if (isChecked !== isRestricted) {
    await restrictSwitch.click();
  }
}

/**
 * Clears workspace-wide access on the share modal when a workspace role is set.
 */
export async function clearWorkspaceWideShareAccess(page: Page): Promise<void> {
  const workspaceRoleSelect = page.getByRole("combobox", {
    name: "Role for everyone in the workspace",
  });
  const clearButton = workspaceRoleSelect
    .locator("xpath=ancestor::div[contains(@class, 'mantine-Input-wrapper')]")
    .getByRole("button")
    .first();
  if (await clearButton.isVisible().catch(() => false)) {
    await clearButton.click();
  }
}

/**
 * Adds a direct share row for a workspace member or tag label.
 */
export async function addDirectShareInModal(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  const { page, principalLabel, role = "viewer" } = options;

  const addTargetSelect = page.getByRole("combobox", {
    name: "Add member or tag",
  });
  await addTargetSelect.click();
  await page.getByRole("option", { name: principalLabel }).click();

  const roleSelect = page.getByRole("combobox", { name: "Role", exact: true });
  await roleSelect.click();
  await page
    .getByRole("option", { name: new RegExp(`^${role}$`, "i") })
    .click();

  await page.getByRole("button", { name: "Add", exact: true }).click();

  await expect(page.getByText(principalLabel).first()).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Closes the share modal via Done.
 */
export async function closeShareModal(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Workspace access")).not.toBeVisible({
    timeout: MEDIUM_WAIT,
  });
}

/**
 * Configures a dataset as restricted with no workspace-wide access.
 */
export async function restrictDatasetWithNoWorkspaceAccess(
  page: Page,
): Promise<void> {
  await openDatasetShareModal(page);
  await setShareModalRestricted(page, true);
  await clearWorkspaceWideShareAccess(page);
  await closeShareModal(page);
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
  await expect(page.getByText(/Dataset failed to load|Not Found/i)).toBeVisible(
    {
      timeout: LONG_WAIT,
    },
  );
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
 */
export async function shareDatasetWithPrincipal(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  await openDatasetShareModal(options.page);
  await addDirectShareInModal(options);
  await closeShareModal(options.page);
}

/** Display name seeded for the secondary E2E viewer membership. */
export const E2E_SECONDARY_MEMBER_DISPLAY_NAME = "E2E Viewer";
