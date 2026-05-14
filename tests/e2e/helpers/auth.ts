import { expect } from "@playwright/test";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

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
  await page.goto("/signin");
  await page.getByLabel("Email").fill(options.email);
  await page.getByRole("textbox", { name: "Password" }).fill(options.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/signin/, { timeout: LONG_WAIT });

  await page.goto(`/${options.workspaceSlug}`);

  await expect(page).toHaveURL(new RegExp(`/${options.workspaceSlug}`), {
    timeout: LONG_WAIT,
  });
}
