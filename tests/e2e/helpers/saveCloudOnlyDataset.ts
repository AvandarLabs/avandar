import { assertIsDefined } from "@avandar/utils";
import { expect } from "@playwright/test";
import {
  makeDatasetPageUrlPatternFromWorkspaceSlug,
  parseDatasetIdFromDataManagerUrl,
} from "./manualUploadCloudSyncFlow";
import { LONG_WAIT, SHORT_WAIT } from "./timeouts";
import type { Page } from "@playwright/test";

/** A dataset saved from an import form. */
export type SavedDataset = {
  datasetId: string;
  datasetName: string;
};

/**
 * Saves the dataset an import form is showing, under the name the form
 * suggested, for a source that can only be stored in the cloud (a Google
 * Sheet or a database table), and waits for its dataset page to open.
 *
 * Use `ensureCloudStorageCheckedAndSaveDataset` instead for an uploaded file:
 * this one does not look for the offline-only checkbox such a source lacks.
 */
export async function saveCloudOnlyDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<SavedDataset> {
  const { page, workspaceSlug } = options;
  const nameInput = page.getByLabel("Dataset name");
  await expect(nameInput).not.toHaveValue("", { timeout: SHORT_WAIT });
  const datasetName = await nameInput.inputValue();

  await page.getByRole("button", { name: "Save Dataset" }).click();
  await expect(page).toHaveURL(
    makeDatasetPageUrlPatternFromWorkspaceSlug(workspaceSlug),
    { timeout: LONG_WAIT },
  );

  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  assertIsDefined(datasetId, `Could not parse dataset id from ${page.url()}`);
  return { datasetId, datasetName };
}
