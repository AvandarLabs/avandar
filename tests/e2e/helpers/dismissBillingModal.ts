import { expect } from "@playwright/test";
import { MEDIUM_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Closes the workspace billing gate when it blocks the UI. E2E workspaces
 * should already have a subscription row; this covers slow loads and legacy
 * dev data without a subscription.
 */
export async function dismissBillingModalIfVisible(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /select your plan/i });
  if (!(await dialog.isVisible())) {
    return;
  }

  await dialog.getByRole("button", { name: /^select plan$/i }).first().click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}
