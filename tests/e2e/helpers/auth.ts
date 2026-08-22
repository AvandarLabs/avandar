import type { Page } from "@playwright/test";

import { expect } from "@playwright/test";

import { SEEDED_WORKSPACE_MENU_BUTTON_NAME } from "./constants";
import { dismissBillingModalIfVisible } from "./dismissBillingModal";
import { LONG_WAIT } from "./timeouts";

type SignInOptions = {
  email: string;
  password: string;
  /** Workspace slug to open after sign-in. */
  workspaceSlug: string;
};

/**
 * Signs in via `/signin`, waits until the route leaves the sign-in page, then
 * navigates to the given workspace home.
 */
export async function signInWithEmailPassword(
  page: Page,
  options: SignInOptions,
): Promise<void> {
  await page.goto("/signin", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(options.email);
  await page.getByRole("textbox", { name: "Password" }).fill(options.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/signin/, { timeout: LONG_WAIT });

  await page.goto(`/${options.workspaceSlug}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL(new RegExp(`/${options.workspaceSlug}`), {
    timeout: LONG_WAIT,
  });

  await dismissBillingModalIfVisible(page);
}

/**
 * Opens the workspace user menu and signs out.
 */
export async function signOutViaUserMenu(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: SEEDED_WORKSPACE_MENU_BUTTON_NAME })
    .click();
  await page.getByRole("menuitem", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/signin/, { timeout: LONG_WAIT });
}

/**
 * Signs out the current user, then signs in as another account.
 */
export async function switchToWorkspaceUser(
  page: Page,
  options: SignInOptions,
): Promise<void> {
  await signOutViaUserMenu(page);
  await signInWithEmailPassword(page, options);
}
