import { expect } from "@playwright/test";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Locator, Page } from "@playwright/test";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

/**
 * Returns a locator scoped to the open share modal. Mantine wraps modal
 * bodies in a `role="dialog"` element labelled by the modal title ("Share"
 * for this dialog). Scoping all interactions to the dialog avoids strict-
 * mode violations with the page-level Share button outside the modal.
 */
function shareDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Share" });
}

/**
 * Opens the new Drive-style share modal by clicking the dataset's `Share`
 * button and waiting for the unified Add combobox to render. Use this from
 * the dataset meta page (`/{slug}/data-manager/{datasetId}`). The page-
 * level Share button lives outside the dialog, so it is queried against
 * the page rather than the dialog scope.
 */
export async function openShareModalV2(page: Page): Promise<void> {
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
 * Closes the v2 share modal via the Done button and waits for the dialog
 * to be gone before returning.
 */
export async function closeShareModalV2(page: Page): Promise<void> {
  await shareDialog(page).getByRole("button", { name: "Done" }).click();
  await expect(shareDialog(page)).toBeHidden({ timeout: MEDIUM_WAIT });
}

/**
 * Sets the v2 General-access dropdown to `Restricted` or `Workspace`
 * (renders as "Anyone in {AppLabel}"). When switching to Workspace and
 * `role` is provided, also flips the right-hand role select to that role.
 */
export async function setGeneralAccessV2(
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

  // mode === "Workspace": the dropdown defaults to "Anyone in {App}" so
  // re-clicking it is a no-op (`allowDeselect={false}`). The only path
  // that reliably writes a workspace-share row is to change the
  // accompanying role select, which always fires `onChange` and routes
  // through the upsertShare mutation. We bounce through Restricted first
  // so the workspace-role select shows up and any prior role value is
  // cleared.
  await generalSelect.click();
  await page.getByRole("option", { name: "Restricted" }).click();
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

  // Wait for the summary line to reflect the workspace share so the next
  // helper call doesn't race the upsert mutation's invalidation.
  const summary = dialog.getByRole("status", { name: "Share summary" });
  await expect(summary).toContainText(
    /accessible to anyone with|anyone with/i,
    {
      timeout: LONG_WAIT,
    },
  );
}

/**
 * Adds a share via the unified Add combobox. Types the principal label as
 * a filter, clicks the matching option, sets the inline role (only if it
 * differs from the default `viewer`), then clicks the dialog-scoped
 * `Share` button. Waits until the new row appears in the People-with-
 * access list before returning.
 */
export async function addShareV2(options: {
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
 * Toggles the "Limit to app access" checkbox for a user-group share row.
 * Idempotent: only clicks when the current state differs from `on`.
 */
export async function toggleRequiresAppAccessV2(options: {
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

/**
 * Asserts the v2 share summary line contains every expected substring.
 * Scopes the assertion to the `role="status"` `Share summary` element so
 * matches against shared substrings (e.g. a user name that also appears
 * in the People-with-access list) cannot accidentally pass against the
 * wrong region of the dialog.
 */
export async function expectSummaryTextV2(
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
 * Asserts the owner row in the People-with-access list shows the `Owner`
 * Mantine badge and exposes no `Remove access for <Owner>` button.
 */
export async function expectOwnerRowReadOnly(options: {
  page: Page;
  ownerLabel: string;
}): Promise<void> {
  const { page, ownerLabel } = options;
  const dialog = shareDialog(page);
  // The owner row always renders the Mantine Badge with literal "Owner".
  await expect(dialog.getByText("Owner", { exact: true })).toBeVisible({
    timeout: MEDIUM_WAIT,
  });
  await expect(
    dialog.getByRole("button", { name: `Remove access for ${ownerLabel}` }),
  ).toHaveCount(0);
  // And the owner's row has no role select (owner is admin, immutable).
  await expect(
    dialog.getByRole("combobox", { name: `Role for ${ownerLabel}` }),
  ).toHaveCount(0);
}

/**
 * Navigates to `/{slug}/shared-with-me` and asserts the resource is listed
 * as a card. The card label uses the resource name via Mantine `Text`,
 * wrapped in a `Link` whose `aria-label` is the resource name.
 */
export async function expectSharedWithMeListsResource(options: {
  page: Page;
  workspaceSlug: string;
  resourceName: string;
}): Promise<void> {
  const { page, workspaceSlug, resourceName } = options;
  const resourceLink = page.getByRole("link", { name: resourceName });

  await expect(async () => {
    await page.goto(`/${workspaceSlug}/shared-with-me`);

    await expect(page).toHaveURL(
      new RegExp(`/${workspaceSlug}/shared-with-me/?$`),
      { timeout: SHORT_WAIT },
    );

    const loader = page.getByLabel("Loading shared resources");
    if ((await loader.count()) > 0) {
      await expect(loader).toBeHidden({ timeout: MEDIUM_WAIT });
    }

    await expect(resourceLink).toBeVisible({ timeout: SHORT_WAIT });
  }).toPass({ timeout: LONG_WAIT });
}

/**
 * Opens a resource from the Shared with me page by clicking its card and
 * waiting until the dataset meta page renders the resource name heading.
 */
export async function openResourceFromSharedWithMe(options: {
  page: Page;
  workspaceSlug: string;
  resourceName: string;
}): Promise<void> {
  const { page, workspaceSlug, resourceName } = options;
  await page.goto(`/${workspaceSlug}/shared-with-me`);
  await page.getByRole("link", { name: resourceName }).click();
  await expect(
    page.getByRole("paragraph").filter({ hasText: resourceName }),
  ).toBeVisible({ timeout: LONG_WAIT });
}
