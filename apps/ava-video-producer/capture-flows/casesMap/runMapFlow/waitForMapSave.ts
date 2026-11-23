import { WAIT } from "../casesMapHelpers";
import type { Page } from "@playwright/test";
/** Waits until the product confirms that its current map edits are saved. */
export async function waitForMapSave(page: Page): Promise<void> {
  await page
    .getByRole("status", { name: "All changes saved", exact: true })
    .waitFor({ timeout: WAIT });
}
