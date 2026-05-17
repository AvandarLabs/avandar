import { expect } from "@playwright/test";
import { CALIFORNIA_CSV_PATH } from "./constants";
import { ensureCloudStorageCheckedAndSaveDataset } from "./manualUploadCloudSyncFlow";
import { LONG_WAIT, MEDIUM_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * Mantine renders the v2 share modal inside a `role="dialog"` element
 * labelled by its title ("Share"). Scoping interactions to the dialog
 * avoids ambiguity with the page-level Share button outside the modal.
 */
function shareDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Share" });
}

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
 * Opens the v2 Share modal from the dataset metadata page. Waits for the
 * Drive-style "Add people, groups, or tags" combobox to appear, which is
 * the most stable v2-only anchor.
 */
export async function openDatasetShareModal(page: Page): Promise<void> {
  const shareButton = page.getByRole("button", { name: "Share" });
  await expect(shareButton).toBeEnabled({ timeout: LONG_WAIT });
  await shareButton.click();
  await expect(
    shareDialog(page).getByRole("combobox", {
      name: "Add people, groups, or tags",
    }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/**
 * Picks "Restricted" or "Anyone in Data Sources" on the v2 General access
 * dropdown. The boolean argument matches the v1 helper signature so the
 * legacy `dataset-sharing.spec.ts` specs can keep calling it unchanged.
 */
export async function setShareModalRestricted(
  page: Page,
  isRestricted: boolean,
): Promise<void> {
  const select = shareDialog(page).getByRole("combobox", {
    name: "General access",
  });
  await select.click();
  if (isRestricted) {
    await page.getByRole("option", { name: "Restricted" }).click();
  } else {
    await page.getByRole("option", { name: /^Anyone in/ }).click();
  }
}

/**
 * No-op shim: the v2 General-access dropdown collapses "no workspace share"
 * and "restricted" into the same option, so once `setShareModalRestricted`
 * has flipped to Restricted there is no separate workspace-role clear to
 * perform. Kept so legacy specs can keep their existing call sequence.
 */
export async function clearWorkspaceWideShareAccess(
  _page: Page,
): Promise<void> {
  return;
}

/**
 * Adds a direct share row for a workspace member or user-group label using
 * the v2 unified Add combobox. Picks the matching option, sets the role on
 * the inline `Role for new share` select, then clicks `Share`.
 */
export async function addDirectShareInModal(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  const { page, principalLabel, role = "viewer" } = options;
  const dialog = shareDialog(page);

  const addCombobox = dialog.getByRole("combobox", {
    name: "Add people, groups, or tags",
  });
  await addCombobox.click();
  await addCombobox.fill(principalLabel);
  await page.getByRole("option", { name: principalLabel }).click();

  if (role !== "viewer") {
    const roleSelect = dialog.getByRole("combobox", {
      name: "Role for new share",
    });
    await roleSelect.click();
    await page
      .getByRole("option", { name: new RegExp(`^${role}$`, "i") })
      .click();
  }

  await dialog.getByRole("button", { name: "Share", exact: true }).click();

  await expect(
    dialog.getByRole("combobox", { name: `Role for ${principalLabel}` }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Closes the v2 share modal via the Done button and waits for the unified
 * Add combobox to be gone before returning.
 */
export async function closeShareModal(page: Page): Promise<void> {
  await shareDialog(page).getByRole("button", { name: "Done" }).click();
  await expect(shareDialog(page)).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * Configures a dataset as restricted with no workspace-wide access.
 * Implementation now drives the v2 modal: open → set General access to
 * Restricted → close.
 */
export async function restrictDatasetWithNoWorkspaceAccess(
  page: Page,
): Promise<void> {
  await openDatasetShareModal(page);
  await setShareModalRestricted(page, true);
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
