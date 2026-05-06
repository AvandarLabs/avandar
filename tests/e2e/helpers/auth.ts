import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

type SignInOptions = {
  email: string;
  password: string;
};

/**
 * Signs in via `/signin` and waits until the route leaves the sign-in page.
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
}
