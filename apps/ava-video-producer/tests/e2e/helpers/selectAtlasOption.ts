import type { Page } from "@playwright/test";

/** Choose a displayed Mantine menu item through the same controls as a viewer. */
export async function selectAtlasOption(
  page: Page,
  label: string,
  option: string,
) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .getByRole("option")
    .filter({ has: page.getByText(option, { exact: true }) })
    .click();
}
