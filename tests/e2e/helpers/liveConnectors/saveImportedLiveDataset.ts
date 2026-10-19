import { expect } from "@playwright/test";
import { parseDatasetIdFromDataManagerUrl } from "../manualUploadCloudSyncFlow";
import { LONG_WAIT, SHORT_WAIT } from "../timeouts";
import type { ImportedLiveDataset } from "./LiveConnectorE2e.types";
import type { Page } from "@playwright/test";

/** Matches the dataset page URL a completed save lands on. */
function _makeDatasetPageUrlPattern(workspaceSlug: string): RegExp {
  const escaped = workspaceSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`/${escaped}/data-manager/[0-9a-f-]{36}`, "i");
}

/**
 * Saves the dataset an import form is showing, under the name the form
 * suggested, and waits for its dataset page to open.
 *
 * Saved through the button directly rather than the shared cloud-sync save
 * helper, which first looks for the offline-only checkbox: a live source has
 * nowhere offline to live, so that control is absent.
 */
export async function saveImportedLiveDataset(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<ImportedLiveDataset> {
  const { page, workspaceSlug } = options;
  const nameInput = page.getByLabel("Dataset name");
  await expect(nameInput).not.toHaveValue("", { timeout: SHORT_WAIT });
  const datasetName = await nameInput.inputValue();

  await page.getByRole("button", { name: "Save Dataset" }).click();
  await expect(page).toHaveURL(_makeDatasetPageUrlPattern(workspaceSlug), {
    timeout: LONG_WAIT,
  });

  const datasetId = parseDatasetIdFromDataManagerUrl({
    url: page.url(),
    workspaceSlug,
  });
  if (!datasetId) {
    throw new Error(`Could not parse dataset id from URL: ${page.url()}`);
  }
  return { datasetId, datasetName };
}
