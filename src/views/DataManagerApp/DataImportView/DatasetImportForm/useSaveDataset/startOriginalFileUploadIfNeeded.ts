import { DatasetOriginalFileStorageClient } from "@/clients/storage/DatasetOriginalFileStorageClient/DatasetOriginalFileStorageClient";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { requiresOriginalFileRetention } from "$/models/datasets/DatasetSource/requiresOriginalFileRetention";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Uploads a newly-saved dataset's retained original file (e.g. the source
 * PDF a table was extracted from) to object storage, alongside the parquet
 * upload.
 *
 * This is gated by two independent conditions that must BOTH hold:
 * 1. `sourceType` is non-reconstructable (`requiresOriginalFileRetention`),
 *    i.e. there is an original worth retaining in the first place.
 * 2. `onlineStorageAllowed` is true, i.e. the user opted into cloud sync
 *    for this dataset.
 *
 * If the user chose offline-only, this is a no-op: the original stays in
 * IndexedDB and nowhere else. That is not a limitation to work around, it is
 * the guarantee the offline-only checkbox makes, and it matters more here
 * than for a spreadsheet, since a PDF is far more likely to be a contract or
 * a patient record.
 *
 * @param options The options for uploading the dataset's original file.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset the original file belongs
 * to.
 * @param options.sourceType The dataset's source type.
 * @param options.onlineStorageAllowed Whether the user allowed cloud sync
 * for this dataset.
 */
export async function startOriginalFileUploadIfNeeded(
  options: Readonly<{
    workspaceId: Workspace.Id;
    datasetId: DatasetId;
    sourceType: DatasetSource.SourceType;
    onlineStorageAllowed: boolean;
  }>,
): Promise<void> {
  const { workspaceId, datasetId, sourceType, onlineStorageAllowed } = options;

  if (!onlineStorageAllowed || !requiresOriginalFileRetention(sourceType)) {
    return;
  }

  const localDataset = await AvaDexie.DB.LocalDataset.get(datasetId);
  if (!localDataset?.sourceBytes) {
    // Silently skipping here would leave a cloud-synced dataset with no
    // original anywhere and no indication anything went wrong, which
    // defeats the retention guarantee at precisely the moment it matters.
    throw new Error(
      `Cannot upload the original file for dataset "${datasetId}": ` +
        "no original file is cached locally.",
    );
  }

  const file = new File(
    [localDataset.sourceBytes],
    localDataset.sourceFileName ?? datasetId,
    { type: localDataset.sourceBytes.type },
  );

  await DatasetOriginalFileStorageClient.uploadOriginalFile({
    workspaceId,
    datasetId,
    file,
  });
}
