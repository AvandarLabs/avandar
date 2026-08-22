import type { Locator, Page, Request } from "@playwright/test";

import { expect } from "@playwright/test";

import { switchToWorkspaceUser } from "./auth";
import { expectDatasetMetaPageDenied } from "./datasetSharingFlow";
import {
  addShare,
  closeShareModal,
  expectShareSummaryText,
  openShareModal,
  setGeneralAccess,
} from "./shareModalFlow";
import { MEDIUM_WAIT } from "./timeouts";

type WorkspaceUser = Readonly<{
  email: string;
  password: string;
}>;

type OnlyMeRevocationFlowOptions = {
  page: Page;
  workspaceSlug: string;
  datasetId: string;
  datasetName: string;
  primaryUser: WorkspaceUser;
  secondaryUser: WorkspaceUser;
  secondaryUserDisplayName: string;
};

type DatasetPageOptions = {
  page: Page;
  workspaceSlug: string;
  datasetId: string;
  datasetName: string;
};

type SwitchUserAndOpenDatasetOptions = DatasetPageOptions & {
  user: WorkspaceUser;
};

function _shareDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: /^Share / });
}

function _isSharingWrite(request: Request): boolean {
  return (
    request.method() !== "GET" &&
    /\/rest\/v1\/(resource_shares|datasets|dashboards|rpc\/rpc_resources__)/.test(
      request.url(),
    )
  );
}

async function _setGeneralAccessToOnlyMe(page: Page): Promise<void> {
  const dialog = _shareDialog(page);
  await dialog.getByRole("combobox", { name: "General access" }).click();
  await page.getByRole("option", { name: "Only me" }).click();

  const confirmDialog = page.getByRole("dialog", { name: /private\?$/ });
  await expect(confirmDialog).toBeVisible({ timeout: MEDIUM_WAIT });
  await confirmDialog.getByRole("button", { name: "Make private" }).click();
  await expect(confirmDialog).toBeHidden({ timeout: MEDIUM_WAIT });
  await expect(
    dialog.getByRole("combobox", { name: "General access" }),
  ).toHaveValue("Only me", { timeout: MEDIUM_WAIT });
}

async function _expectRestrictedIntentOnly(page: Page): Promise<void> {
  const dialog = _shareDialog(page);
  const writes: string[] = [];
  const recordWrite = (request: Request): void => {
    if (_isSharingWrite(request)) {
      writes.push(`${request.method()} ${request.url()}`);
    }
  };
  page.on("request", recordWrite);

  try {
    await dialog.getByRole("combobox", { name: "General access" }).click();
    await page.getByRole("option", { name: "Restricted" }).click();
    await expect(
      dialog.getByRole("combobox", { name: "General access" }),
    ).toHaveValue("Restricted", { timeout: MEDIUM_WAIT });
    await expect(
      dialog.getByRole("combobox", { name: "Add people or user groups" }),
    ).toBeEnabled({ timeout: MEDIUM_WAIT });
    expect(
      writes,
      "Restricted from private must not write to the server",
    ).toEqual([]);
  } finally {
    page.off("request", recordWrite);
  }
}

async function _openDataSources(page: Page): Promise<void> {
  const dataSourcesLink = page
    .getByRole("link", { name: "Data Sources", exact: true })
    .first();
  await expect(dataSourcesLink).toBeVisible({ timeout: MEDIUM_WAIT });
  await dataSourcesLink.click();
  await expect(page).toHaveURL(/\/data-manager\/data-import\/?(?:\?.*)?$/, {
    timeout: MEDIUM_WAIT,
  });
}

async function _openDataset(
  options: Readonly<DatasetPageOptions>,
): Promise<void> {
  await _openDataSources(options.page);
  const datasetLink = options.page.getByRole("link", {
    name: options.datasetName,
    exact: true,
  });
  await expect(datasetLink).toBeVisible({ timeout: MEDIUM_WAIT });
  await datasetLink.click();
  await expect(options.page).toHaveURL(
    new RegExp(
      `/${options.workspaceSlug}/data-manager/${options.datasetId}/?(?:\\?.*)?$`,
    ),
    { timeout: MEDIUM_WAIT },
  );
  await expect(
    options.page
      .getByRole("paragraph")
      .filter({ hasText: options.datasetName }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

async function _switchUserAndOpenDataset(
  options: Readonly<SwitchUserAndOpenDatasetOptions>,
): Promise<void> {
  await switchToWorkspaceUser(options.page, {
    ...options.user,
    workspaceSlug: options.workspaceSlug,
  });
  await _openDataset(options);
}

async function _shareWithSecondary(
  options: Readonly<{
    page: Page;
    secondaryUserDisplayName: string;
  }>,
): Promise<void> {
  await openShareModal(options.page);
  await setGeneralAccess(options.page, "Restricted");
  await addShare({
    page: options.page,
    principalLabel: options.secondaryUserDisplayName,
    role: "editor",
  });
  await closeShareModal(options.page);
}

async function _makeDatasetPrivate(page: Page): Promise<void> {
  await openShareModal(page);
  await _setGeneralAccessToOnlyMe(page);
  await expectShareSummaryText(page, ["Only you have access"]);
  await _expectRestrictedIntentOnly(page);
  await closeShareModal(page);
}

async function _expectSecondaryRevoked(
  options: Readonly<OnlyMeRevocationFlowOptions>,
): Promise<void> {
  await switchToWorkspaceUser(options.page, {
    ...options.secondaryUser,
    workspaceSlug: options.workspaceSlug,
  });
  await _openDataSources(options.page);
  await expect(
    options.page.getByRole("link", {
      name: options.datasetName,
      exact: true,
    }),
  ).toHaveCount(0);
  await expectDatasetMetaPageDenied(options.page, {
    workspaceSlug: options.workspaceSlug,
    datasetId: options.datasetId,
  });
}

async function _runOnlyMeRevocationFlow(
  options: Readonly<OnlyMeRevocationFlowOptions>,
): Promise<void> {
  await _shareWithSecondary({
    page: options.page,
    secondaryUserDisplayName: options.secondaryUserDisplayName,
  });
  await _switchUserAndOpenDataset({
    ...options,
    user: options.secondaryUser,
  });
  await _switchUserAndOpenDataset({ ...options, user: options.primaryUser });
  await _makeDatasetPrivate(options.page);
  await _expectSecondaryRevoked(options);
}

/**
 * Browser flow for making a shared dataset private and verifying revocation.
 */
export const ShareModalPrivateAccess = {
  /** Runs the Only me sharing flow through user-visible navigation. */
  runOnlyMeRevocationFlow: _runOnlyMeRevocationFlow,
} as const;
