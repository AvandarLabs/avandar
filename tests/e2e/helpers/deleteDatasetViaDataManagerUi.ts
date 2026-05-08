import { expect } from "@playwright/test";
import { isDatasetParquetInStorage } from "../../helper/supabaseAdminClient";
import type { Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes the dataset on the current Data Manager metadata page using the
 * Delete Dataset button, confirms the modal, then verifies redirect to the
 * data sources list, success copy, removal of the dataset row, and Parquet
 * object cleanup in storage.
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

  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();

  await page.waitForURL(dataSourcesListUrl, {
    timeout: 60_000,
    waitUntil: "commit",
  });

  await expect(page.getByText("Dataset deleted")).toBeVisible();

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
      { timeout: 60_000 },
    )
    .toBe(true);

  await expect
    .poll(
      async () => {
        return !(await isDatasetParquetInStorage({
          admin,
          workspaceId,
          datasetId,
        }));
      },
      { timeout: 60_000 },
    )
    .toBe(true);
}
