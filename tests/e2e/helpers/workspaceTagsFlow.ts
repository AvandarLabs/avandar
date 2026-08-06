import { expect } from "@playwright/test";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Opens one tab of the Workspace settings page. Navigates client-side because
 * a `page.goto` would rehydrate the persisted React Query cache from
 * IndexedDB, and since the throttled persister may not have written the newest
 * snapshot yet, the restored entry can be a pre-mutation one that still counts
 * as fresh. See `docs/rules/e2e-testing.md`.
 */
async function _openWorkspaceSettingsTab(options: {
  page: Page;
  workspaceSlug: string;
  tabName: string;
}): Promise<void> {
  const { page, workspaceSlug, tabName } = options;

  // Already on settings: switch tabs without leaving the page.
  if (!page.url().includes(`/${workspaceSlug}/settings`)) {
    await page.getByRole("link", { name: "Settings" }).click();
  }

  const tab = page.getByRole("tab", { name: tabName });
  await expect(tab).toBeVisible({ timeout: LONG_WAIT });
  await tab.click();
}

/**
 * Creates a workspace user-group tag from Settings → Tags.
 */
export async function createWorkspaceTagViaSettings(options: {
  page: Page;
  workspaceSlug: string;
  tagName: string;
  tagColor?: string;
}): Promise<void> {
  const { page, workspaceSlug, tagName, tagColor = "#228be6" } = options;

  await _openWorkspaceSettingsTab({
    page,
    workspaceSlug,
    tabName: "User groups",
  });
  await page.getByRole("button", { name: "New user group" }).click();

  await page.getByRole("textbox", { name: "Name" }).fill(tagName);
  if (tagColor !== "#228be6") {
    await page.getByRole("textbox", { name: "Color" }).fill(tagColor);
    await page.keyboard.press("Escape");
  }
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

  // The modal only closes once the insert succeeds, and the row only renders
  // from the refetched list: together they prove the group is persisted
  // before the caller navigates away.
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: MEDIUM_WAIT });
  await expect(page.getByText(tagName)).toBeVisible({ timeout: MEDIUM_WAIT });
}

/**
 * Assigns an existing tag to a workspace member via Settings → Members.
 */
export async function assignWorkspaceTagToMember(options: {
  page: Page;
  workspaceSlug: string;
  memberDisplayName: string;
  tagName: string;
}): Promise<void> {
  const { page, workspaceSlug, memberDisplayName, tagName } = options;

  await _openWorkspaceSettingsTab({ page, workspaceSlug, tabName: "Members" });

  const memberRow = page
    .getByRole("row")
    .filter({ hasText: memberDisplayName });
  await memberRow.getByLabel("Edit permissions").click();

  const drawer = page.locator(".mantine-Drawer-content");
  await expect(drawer).toBeVisible({ timeout: LONG_WAIT });

  // The field stays disabled until the user-group list has finished fetching,
  // so waiting for it to be enabled means waiting for a list that already
  // includes a group created moments ago.
  const tagsField = drawer.getByRole("combobox", { name: "User groups" });
  await expect(tagsField).toBeEnabled({ timeout: LONG_WAIT });

  const tagOption = page.getByRole("option", { name: tagName });
  await expect(async () => {
    // Clicking a Mantine MultiSelect *toggles* its dropdown, so only click
    // when it is collapsed: clicking on every retry would close the
    // dropdown the previous attempt opened and halve the real retries.
    if ((await tagsField.getAttribute("aria-expanded")) !== "true") {
      await tagsField.click();
    }
    await expect(tagOption).toBeVisible({ timeout: SHORT_WAIT });
  }).toPass({ timeout: LONG_WAIT });
  await tagOption.click();
  await page.keyboard.press("Escape");
  await drawer.getByRole("button", { name: "Save changes" }).click();

  await expect(memberRow.getByText(tagName)).toBeVisible({
    timeout: LONG_WAIT,
  });
}
