import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * Parses the dataset id from a data-manager dataset URL.
 *
 * @param options.url Full page URL.
 * @param options.workspaceSlug Workspace slug segment.
 */
export function parseDatasetIdFromDataManagerUrl(options: {
  url: string;
  workspaceSlug: string;
}): string | undefined {
  const escaped = options.workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `/${escaped}/data-manager/([0-9a-f-]{36})(?:/|$|\\?)`,
    "i",
  );
  const match = options.url.match(re);

  return match?.[1];
}

/**
 * After save, waits until the cloud-sync toggle is idle (upload finished) and
 * shows the online / synced affordance (`aria-label` "Make offline-only").
 *
 * @param page Playwright page on the dataset meta view.
 */
export async function pollUntilCloudDatasetToggleShowsOnline(
  page: Page,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const toggle = page.getByRole("button", { name: "Make offline-only" });

        return (await toggle.isVisible()) && (await toggle.isEnabled());
      },
      { timeout: 180_000 },
    )
    .toBe(true);
}

/**
 * Ensures the import form keeps cloud storage enabled, then saves.
 *
 * @param page Playwright page with the manual upload import form visible.
 */
export async function ensureCloudStorageCheckedAndSaveDataset(
  page: Page,
): Promise<void> {
  const cloudCheckbox = page.getByRole("checkbox", {
    name: /This dataset can be stored in the cloud/i,
  });

  await expect(cloudCheckbox).toBeVisible();

  if (!(await cloudCheckbox.isChecked())) {
    await cloudCheckbox.check();
  }

  await page.getByRole("button", { name: "Save Dataset" }).click();
}
