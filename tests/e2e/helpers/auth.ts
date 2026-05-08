import { expect } from "@playwright/test";
import { E2E_SEEDED_WORKSPACE_SLUG } from "../setup/e2e-credentials";
import type { Page } from "@playwright/test";

type SignInOptions = {
  email: string;
  password: string;
  /** Workspace slug to open after sign-in (defaults to E2E workspace). */
  workspaceSlug?: string;
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
  await page.getByLabel("Password").fill(options.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/signin/, { timeout: 90_000 });

  const workspaceSlug = options.workspaceSlug ?? E2E_SEEDED_WORKSPACE_SLUG;
  await page.goto(`/${workspaceSlug}`);

  await expect(page).toHaveURL(new RegExp(`/${workspaceSlug}`), {
    timeout: 60_000,
  });
}
