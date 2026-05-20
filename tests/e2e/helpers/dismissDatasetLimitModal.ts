import { expect } from "@playwright/test";
import { MEDIUM_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Closes the dataset-cap modal so later assertions can read the page. Upload
 * stays blocked until datasets are removed or the plan limit increases.
 */
export async function dismissDatasetLimitModalIfVisible(
  page: Page,
): Promise<void> {
  const dialog = page.getByRole("dialog", { name: /dataset limit reached/i });
  if (!(await dialog.isVisible())) {
    return;
  }

  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden({ timeout: MEDIUM_WAIT });
}
