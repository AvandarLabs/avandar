import { expect } from "@playwright/test";
import { LONG_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/**
 * Picks a table or view in the Postgres import form's relation selector. The
 * most recently verified saved connection is picked automatically and its
 * relations are listed without a click, so the selector is the first step.
 */
export async function pickPostgresRelation(
  options: Readonly<{ page: Page; relationLabel: string }>,
): Promise<void> {
  const { page } = options;
  const relationSelect = page.getByRole("combobox", {
    name: "Table or view to import",
  });
  await expect(relationSelect).toBeVisible({ timeout: LONG_WAIT });
  await relationSelect.click();
  await page
    .getByRole("option", { name: options.relationLabel, exact: true })
    .click();
}
