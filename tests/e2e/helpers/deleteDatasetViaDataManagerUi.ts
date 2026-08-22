import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { expect } from "@playwright/test";

import { isDatasetParquetInStorage } from "./supabaseAdminClient";
import { LONG_WAIT } from "./timeouts";

/**
 * Deletes the dataset on the current Data Manager metadata page using the
 * Delete Dataset button, confirms the modal, then verifies redirect to the
 * data sources list, removal of the dataset row, and Parquet object cleanup
 * in storage.
 */
export async function deleteDatasetViaDataManagerUiAndVerify(options: {
  admin: SupabaseClient;
  datasetId: string;
  page: Page;
  workspaceId: string;
  workspaceSlug: string;
}): Promise<void> {
  const { admin, datasetId, page, workspaceId, workspaceSlug } = options;
  const escapedSlug = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const dataSourcesListUrl = new RegExp(
    `/${escapedSlug}/data-manager(?:/)?(?:\\?.*)?$`,
    "i",
  );

  await page.getByRole("button", { name: "Delete Dataset" }).click();

  const deleteConfirmButton = page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true });
  await expect(deleteConfirmButton).toBeVisible();
  // Mantine modals and stacked notifications can keep the confirm button
  // animating; evaluate-click avoids Playwright "not stable" retries.
  await deleteConfirmButton.evaluate((node) => {
    (node as HTMLButtonElement).click();
  });

  await page.waitForURL(dataSourcesListUrl, {
    timeout: LONG_WAIT,
    waitUntil: "commit",
  });

  // Deletion success is verified via DB and storage polls below. The Mantine
  // toast auto-dismisses and can be buried under stacked import notifications.

  await expect
    .poll(
      async () => {
        const { data, error } = await admin
          .from("datasets")
          .select("id")
          .eq("id", datasetId)
          .maybeSingle();

        if (error) {
          throw new Error(`dataset lookup failed: ${error.message}`);
        }

        return data === null;
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        return !(await isDatasetParquetInStorage({
          supabaseAdminClient: admin,
          workspaceId,
          datasetId,
        }));
      },
      { timeout: LONG_WAIT },
    )
    .toBe(true);
}
