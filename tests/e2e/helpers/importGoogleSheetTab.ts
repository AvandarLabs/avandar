import { expect } from "@playwright/test";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Chooses a tab of the picked Google Sheet in the import form's tab selector,
 * and starts reading it.
 */
export async function importGoogleSheetTab(
  options: Readonly<{ page: Page; tabTitle: string }>,
): Promise<void> {
  const { page } = options;
  const tabSelect = page.getByRole("combobox", { name: "Tab to import" });
  await expect(tabSelect).toBeVisible({ timeout: LONG_WAIT });
  await tabSelect.click();
  await page
    .getByRole("option", { name: options.tabTitle, exact: true })
    .click();
  await page.getByRole("button", { name: "Process", exact: true }).click();
}
