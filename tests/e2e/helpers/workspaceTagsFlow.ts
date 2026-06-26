import { expect } from "@playwright/test";
import { LONG_WAIT, MEDIUM_WAIT, SHORT_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

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

  await page.goto(`/${workspaceSlug}/settings`);
  await page.getByRole("tab", { name: "User groups" }).click();
  await page.getByRole("button", { name: "New user group" }).click();

  await page.getByRole("textbox", { name: "Name" }).fill(tagName);
  if (tagColor !== "#228be6") {
    await page.getByRole("textbox", { name: "Color" }).fill(tagColor);
    await page.keyboard.press("Escape");
  }
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();

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

  await page.goto(`/${workspaceSlug}/settings`);
  await page.getByRole("tab", { name: "Members" }).click();

  const memberRow = page
    .getByRole("row")
    .filter({ hasText: memberDisplayName });
  await memberRow.getByLabel("Edit permissions").click();

  const drawer = page.locator(".mantine-Drawer-content");
  await expect(drawer).toBeVisible({ timeout: LONG_WAIT });

  const tagsField = drawer.getByLabel("User groups");
  await expect(async () => {
    await tagsField.click();
    const tagOption = page.getByRole("option", { name: tagName });
    await expect(tagOption).toBeVisible({ timeout: SHORT_WAIT });
    await tagOption.click();
  }).toPass({ timeout: LONG_WAIT });
  await page.keyboard.press("Escape");
  await drawer.getByRole("button", { name: "Save changes" }).click();

  await expect(memberRow.getByText(tagName)).toBeVisible({
    timeout: LONG_WAIT,
  });
}
