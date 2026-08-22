import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";

import {
  getOriginalFileExtensionFromSourceType,
  requiresOriginalFileRetention,
} from "$/models/datasets/DatasetSource/DatasetSource";
import { DatasetOriginalFileStorageClient } from "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";

/**
 * Removes a dataset's retained original file from object storage as part of
 * making the dataset offline-only.
 *
 * A no-op for source types that retain no original (CSV, XLSX, ...): there is
 * nothing beside the parquet to remove.
 *
 * For a retained original (e.g. a PDF) this is the other half of going
 * offline-only. Deleting only the parquet would leave
 * `<workspaceId>/datasets/<datasetId>.original.pdf` in the `workspaces`
 * bucket, readable by anyone with `viewer` on the dataset, while the UI told
 * the user nobody on their team can access the data any more.
 *
 * Two deliberate refusals:
 *
 * 1. If the original is not cached locally on this device, we do not delete
 *    the cloud copy. Offline-only means "the original lives in IndexedDB and
 *    nowhere else", so deleting the only remaining copy would turn a privacy
 *    action into data loss. The user is told to do this from the device that
 *    holds the file.
 * 2. Any failure propagates. Unlike `fullDelete`, where the metadata row is
 *    already gone and a stranded blob must not leave the user with an
 *    undeletable dataset, here nothing has been committed yet: if the blob
 *    cannot be removed then the user's offline-only request has not been
 *    honoured and they must hear about it rather than be told "now
 *    offline-only" over a file that is still online.
 *
 * Call this before deleting the parquet and before flipping
 * `isInCloudStorage`, so a failure leaves the dataset fully cloud-synced and
 * self-consistent rather than half-migrated.
 *
 * @param options The options for deleting the retained original.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset going offline-only.
 * @param options.sourceType The dataset's source type.
 */
export async function deleteRetainedOriginalFromCloud(
  options: Readonly<{
    workspaceId: Workspace.Id;
    datasetId: DatasetId;
    sourceType: DatasetSource.SourceType;
  }>,
): Promise<void> {
  const { workspaceId, datasetId, sourceType } = options;

  if (!requiresOriginalFileRetention(sourceType)) {
    return;
  }

  const localDataset = await AvaDexie.DB.LocalDataset.get(datasetId);
  if (!localDataset?.sourceBytes) {
    throw new Error(
      "The original file for this dataset is not stored on this device, so removing it from online storage would delete the only copy. Make the dataset offline-only from the device that holds the original.",
    );
  }

  await DatasetOriginalFileStorageClient.deleteOriginalFile({
    workspaceId,
    datasetId,
    fileExtension: getOriginalFileExtensionFromSourceType(sourceType),
  });
}
