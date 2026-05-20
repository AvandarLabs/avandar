import { expect } from "@playwright/test";
import { LONG_WAIT, SHORT_WAIT } from "./timeouts";
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
      { timeout: LONG_WAIT },
    )
    .toBe(true);
}

/**
 * Ensures cloud storage stays enabled, saves, and waits for the dataset meta
 * route (`/{workspaceSlug}/data-manager/{uuid}`). Uses `waitUntil: "commit"`
 * so client-side navigations are not blocked on a full `load` event.
 *
 * @param options.page Import form page.
 * @param options.workspaceSlug Workspace slug segment from the URL.
 * @param options.navigationTimeout Max ms to wait for navigation (default
 *   120_000).
 */
export async function ensureCloudStorageCheckedAndSaveDataset(options: {
  page: Page;
  workspaceSlug: string;
  navigationTimeout?: number;
}): Promise<void> {
  const { page, workspaceSlug } = options;
  const navigationTimeout = options.navigationTimeout ?? LONG_WAIT;

  const cloudCheckbox = page.getByRole("checkbox", {
    name: /This dataset can be stored in the cloud/i,
  });

  await expect(cloudCheckbox).toBeVisible({ timeout: SHORT_WAIT });

  if (!(await cloudCheckbox.isChecked())) {
    await cloudCheckbox.check();
  }

  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaUrl = new RegExp(`/${escaped}/data-manager/[0-9a-f-]{36}`, "i");

  await page.getByRole("button", { name: "Save Dataset" }).click();
  await expect
    .poll(() => {
      return metaUrl.test(page.url());
    }, { timeout: navigationTimeout })
    .toBe(true);
}
