import { MIMEType } from "$/lib/types/common";
import { where } from "$/lib/utils/filters/filters";
import { CSVFileDatasetClient } from "@/clients/datasets/CSVFileDatasetClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { notifyError } from "@/lib/ui/notifications/notify";
import { DatasetId } from "@/models/datasets/Dataset";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";
import { DatasetUploadProgressStore } from "./DatasetUploadProgressStore";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  getDatasetParquetStoragePath,
  WORKSPACES_BUCKET_NAME,
} from "./utils";

/**
 * Uploads the parquet blob to Supabase storage as a single async operation.
 * This is a one-shot upload, it does not chunk the upload and does not support
 * resumability.
 */
async function _oneShotParquetBlobUpload(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob } = options;
  const objectPath = getDatasetParquetStoragePath({ workspaceId, datasetId });
  const { error } = await AvaSupabase.DB.storage
    .from(WORKSPACES_BUCKET_NAME)
    .upload(objectPath, parquetBlob, {
      contentType: MIMEType.APPLICATION_PARQUET,
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Uploads a dataset's Parquet blob to Supabase storage.
 *
 * This requires that the dataset be available locally (so we can extract
 * the Parquet blob).
 *
 * For now, we only allow one-shot uploads.
 */
async function _uploadDatasetToSupabase(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): Promise<void> {
  const { workspaceId, datasetId } = options;

  const localDataset = await LocalDatasetClient.getById({ id: datasetId });
  if (!localDataset) {
    throw new Error("Dataset is not available locally on this device.");
  }

  const parquetBlob = localDataset.parquetData;

  // TODO(jpsyx): support chunked uploads with resumability for larger sizes
  if (parquetBlob.size > DIRECT_UPLOAD_MAX_BYTES) {
    throw new Error("This dataset is too large to sync online yet.");
  }

  await _oneShotParquetBlobUpload({
    workspaceId,
    datasetId,
    parquetBlob,
  });

  const csvFileDataset = await CSVFileDatasetClient.getOne(
    where("dataset_id", "eq", datasetId),
  );

  if (!csvFileDataset) {
    throw new Error("CSV dataset metadata is missing.");
  }

  // upload is complete, so we update the CSV file in our db to reflect
  // that it is in cloud storage.
  await CSVFileDatasetClient.update({
    id: csvFileDataset.id,
    data: {
      isInCloudStorage: false,
    },
  });

  // invalidate necessary queries in our queryClient cache
  AvaQueryClient.invalidateQueries({
    queryKey: DatasetClient.QueryKeys.getAll(),
  });
  AvaQueryClient.invalidateQueries({
    queryKey: DatasetClient.QueryKeys.getSourceDataset({
      datasetId,
      sourceType: "csv_file",
    }),
  });
}

/**
 * Starts syncing a dataset's Parquet to object storage.
 *
 * This is safe to call multiple times; duplicate calls for the same dataset
 * will reuse the same in-flight promise.
 *
 * @param options The options for starting the dataset upload.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to upload.
 * @returns A promise that resolves when the dataset upload is complete.
 */
export async function startDatasetUpload(options: {
  workspaceId: WorkspaceId;
  datasetId: DatasetId;
}): Promise<void> {
  const { datasetId } = options;

  const currentUpload =
    DatasetUploadProgressStore.getInProgressUpload(datasetId);
  if (currentUpload) {
    return await currentUpload;
  }

  const uploadPromise = _uploadDatasetToSupabase(options)
    .catch((error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      notifyError({
        title: "Unable to sync dataset online",
        message: errorMessage,
      });
      throw error;
    })
    .finally(() => {
      DatasetUploadProgressStore.removeUpload(datasetId);
    });

  DatasetUploadProgressStore.addUpload(datasetId, uploadPromise);
  return await uploadPromise;
}
