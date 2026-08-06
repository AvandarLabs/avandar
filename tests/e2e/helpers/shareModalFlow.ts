import { expect } from "@playwright/test";
import { LONG_WAIT, MEDIUM_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * Locator scoped to the open share modal (`role="dialog"`, title "Share").
 */
function shareDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Share" });
}

/**
 * Opens the share modal from the dataset meta page and waits for the Add
 * people/groups/tags combobox.
 */
export async function openShareModal(page: Page): Promise<void> {
  const shareButton = page.getByRole("button", { name: "Share" });
  await expect(shareButton).toBeEnabled({ timeout: LONG_WAIT });
  await shareButton.click();
  await expect(
    shareDialog(page).getByRole("combobox", {
      name: "Add people or user groups",
    }),
  ).toBeVisible({ timeout: LONG_WAIT });
}

/** Closes the share modal via Done and waits for the dialog to hide. */
export async function closeShareModal(page: Page): Promise<void> {
  await shareDialog(page).getByRole("button", { name: "Done" }).click();
  await expect(shareDialog(page)).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * Sets General access to Restricted or Workspace (Anyone in {app}). For
 * Workspace, optionally sets the workspace-wide role.
 */
export async function setGeneralAccess(
  page: Page,
  mode: "Restricted" | "Workspace",
  role?: RoleLevel,
): Promise<void> {
  const dialog = shareDialog(page);
  const generalSelect = dialog.getByRole("combobox", {
    name: "General access",
  });

  if (mode === "Restricted") {
    await generalSelect.click();
    await page.getByRole("option", { name: "Restricted" }).click();
    return;
  }

  await generalSelect.click();
  await page.getByRole("option", { name: /^Anyone in/ }).click();

  const workspaceRole: RoleLevel = role ?? "viewer";
  const roleSelect = dialog.getByRole("combobox", {
    name: "Role for everyone in the workspace",
  });
  await expect(roleSelect).toBeVisible({ timeout: MEDIUM_WAIT });
  await roleSelect.click();
  await page
    .getByRole("option", { name: new RegExp(`^${workspaceRole}$`, "i") })
    .click();

  await expect(dialog).toContainText(/anyone with/i, { timeout: MEDIUM_WAIT });
}

/**
 * Adds a share via the Add combobox, sets role when not viewer, and waits
 * for the principal row to appear.
 */
export async function addShare(options: {
  page: Page;
  principalLabel: string;
  role?: RoleLevel;
}): Promise<void> {
  const { page, principalLabel, role = "viewer" } = options;
  const dialog = shareDialog(page);

  const addCombobox = dialog.getByRole("combobox", {
    name: "Add people or user groups",
  });
  await addCombobox.click();
  await addCombobox.fill(principalLabel);
  await page.getByRole("option", { name: principalLabel }).click();

  if (role !== "viewer") {
    const roleSelect = dialog.getByRole("combobox", {
      name: "Role for new share",
    });
    await roleSelect.click();
    const option = page
      .getByRole("option", { name: new RegExp(`^${role}$`, "i") })
      .first();
    await expect(option).toBeVisible({ timeout: MEDIUM_WAIT });
    await option.click();
  }

  await dialog.getByRole("button", { name: "Share", exact: true }).click();

  await expect(
    dialog.getByRole("combobox", { name: `Role for ${principalLabel}` }),
  ).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Toggles "Limit to app access" for a group share row (idempotent).
 */
export async function toggleRequiresAppAccess(options: {
  page: Page;
  groupLabel: string;
  on: boolean;
}): Promise<void> {
  const { page, groupLabel, on } = options;
  const checkbox = shareDialog(page).getByRole("checkbox", {
    name: `Limit ${groupLabel} to app access`,
  });
  await expect(checkbox).toBeVisible({ timeout: MEDIUM_WAIT });
  const isChecked = await checkbox.isChecked();
  if (isChecked !== on) {
    await checkbox.click();
  }
  await expect(checkbox).toBeChecked({ checked: on, timeout: MEDIUM_WAIT });
}

/** Asserts the share summary line contains each expected substring. */
export async function expectShareSummaryText(
  page: Page,
  substrings: readonly string[],
): Promise<void> {
  const summary = shareDialog(page).getByRole("status", {
    name: "Share summary",
  });
  await expect(summary).toBeVisible({ timeout: MEDIUM_WAIT });
  for (const substring of substrings) {
    await expect(summary).toContainText(substring, { timeout: MEDIUM_WAIT });
  }
}

/**
 * Asserts the owner row shows the Owner badge with no remove button or
 * role select.
 */
export async function expectOwnerRowReadOnly(options: {
  page: Page;
  ownerLabel: string;
}): Promise<void> {
  const { page, ownerLabel } = options;
  const dialog = shareDialog(page);

  // Assert the resolved owner name first: it is the row's identity, and
  // asserting it before the badge keeps a failure readable instead of
  // reporting a strict-mode violation on some other "Owner" text.
  await expect(dialog.getByText(ownerLabel, { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  // Scope the badge assertion to the Mantine badge label so it cannot also
  // match a display name that happens to read "Owner".
  await expect(
    dialog.locator(".mantine-Badge-label").filter({ hasText: /^Owner$/ }),
  ).toHaveCount(1);
  await expect(
    dialog.getByRole("button", { name: `Remove access for ${ownerLabel}` }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("combobox", { name: `Role for ${ownerLabel}` }),
  ).toHaveCount(0);
}
