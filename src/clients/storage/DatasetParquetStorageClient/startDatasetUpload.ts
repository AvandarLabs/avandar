import { notifyError } from "@ui";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { MIMEType } from "@utils";
import { AuthClient } from "@/clients/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient";
import { SourceDatasetClient } from "@/clients/datasets/SourceDatasetClient";
import { DatasetUploadProgressStore } from "@/clients/storage/DatasetParquetStorageClient/DatasetUploadProgressStore";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  getDatasetParquetStoragePath,
  WORKSPACES_BUCKET_NAME,
} from "@/clients/storage/DatasetParquetStorageClient/utils";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";

async function _getTusHeaders(): Promise<Record<string, string>> {
  const session = await AuthClient.getCurrentSession();
  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to sync datasets online.");
  }

  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!apiKey) {
    throw new Error("VITE_SUPABASE_ANON_KEY is not set.");
  }

  return {
    apikey: apiKey,
    authorization: `Bearer ${accessToken}`,
    "x-upsert": "true",
  };
}

async function _resumableParquetBlobUpload(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob } = options;

  const endpoint = `${AvaSupabase.getAPIURL()}/storage/v1/upload/resumable`;
  const objectPath = getDatasetParquetStoragePath({ workspaceId, datasetId });

  const tusHeaders = await _getTusHeaders();

  const parquetFile = new File([parquetBlob], `${datasetId}.parquet`, {
    type: MIMEType.APPLICATION_PARQUET,
  });

  const uppy = new Uppy({
    autoProceed: true,
    allowMultipleUploads: false,
  });

  uppy.use(Tus, {
    endpoint,
    chunkSize: 6 * 1024 * 1024,
    retryDelays: [0, 1000, 3000, 5000, 10000],
    headers: tusHeaders,
    removeFingerprintOnSuccess: true,
  });

  uppy.addFile({
    name: parquetFile.name,
    type: parquetFile.type,
    data: parquetFile,
    meta: {
      bucketName: WORKSPACES_BUCKET_NAME,
      objectName: objectPath,
      contentType: MIMEType.APPLICATION_PARQUET,
      metadata: JSON.stringify({ datasetId, workspaceId }),
    },
  });

  uppy.on("upload-progress", (_file, progress) => {
    DatasetUploadProgressStore.setUploadedBytes(
      datasetId,
      progress.bytesUploaded,
    );
  });

  try {
    const result = await uppy.upload();
    const failedUploads = result?.failed ?? [];
    if (failedUploads.length > 0) {
      const firstFailure = failedUploads[0];
      throw firstFailure?.error ?? new Error("Upload failed.");
    }
  } finally {
    uppy.destroy();
  }
}

/**
 * Uploads the parquet blob to Supabase storage as a single async operation.
 * This is a one-shot upload, it does not chunk the upload and does not support
 * resumability.
 */
async function _oneShotParquetBlobUpload(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  parquetBlob: Blob;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob } = options;
  const objectPath = getDatasetParquetStoragePath({ workspaceId, datasetId });
  const { error } = await AvaSupabase.db().storage
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
 */
async function _uploadDatasetToSupabase(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  parquetBlob: Blob;
  sourceType: DatasetSource.SourceType;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob, sourceType } = options;

  if (parquetBlob.size > DIRECT_UPLOAD_MAX_BYTES) {
    await _resumableParquetBlobUpload({
      workspaceId,
      datasetId,
      parquetBlob,
    });
  } else {
    await _oneShotParquetBlobUpload({
      workspaceId,
      datasetId,
      parquetBlob,
    });
  }

  DatasetUploadProgressStore.setUploadedBytes(datasetId, parquetBlob.size);
  DatasetUploadProgressStore.markCompleted(datasetId);

  const sourceDataset = await SourceDatasetClient.getByDatasetId({
    sourceType,
    datasetId,
  });

  if (!sourceDataset) {
    throw new Error("Source dataset metadata is missing.");
  }

  // Upload is complete; persist cloud storage flag on the source row.
  await SourceDatasetClient.update({
    sourceType,
    id: sourceDataset.id,
    data: {
      isInCloudStorage: true,
    },
  });

  // invalidate necessary queries in our queryClient cache
  AvaQueryClient.invalidateQueries({
    queryKey: DatasetClient.QueryKeys.getAll(),
  });
  AvaQueryClient.invalidateQueries({
    queryKey: DatasetClient.QueryKeys.getSourceDataset({
      datasetId,
      sourceType,
    }),
  });
}

/**
 * Starts syncing a dataset's Parquet to object storage. This requires that the
 * parquet to upload already be in local storage (IndexedDB).
 *
 * This is safe to call multiple times; duplicate calls for the same dataset
 * will reuse the same in-flight promise.
 *
 * @param options The options for starting the dataset upload.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to upload.
 * @param options.sourceType The type of the dataset to upload.
 * @returns A promise that resolves when the dataset upload is complete.
 */
export async function startDatasetUpload(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  sourceType: DatasetSource.SourceType;
}): Promise<void> {
  const { datasetId, sourceType } = options;

  const currentUpload =
    DatasetUploadProgressStore.getInProgressUpload(datasetId);
  if (currentUpload) {
    return await currentUpload;
  }

  const localDataset = await LocalDatasetClient.getById({ id: datasetId });
  if (!localDataset) {
    throw new Error("Dataset is not available locally on this device.");
  }

  const parquetBlob = localDataset.parquetData;

  const makeUploadPromise = async (): Promise<void> => {
    try {
      await _uploadDatasetToSupabase({
        ...options,
        parquetBlob,
        sourceType,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      DatasetUploadProgressStore.markError(datasetId, errorMessage);
      notifyError({
        title: "Unable to sync dataset online",
        message: errorMessage,
      });
      throw error;
    } finally {
      DatasetUploadProgressStore.removeUpload(datasetId);
    }
  };

  const uploadPromise = makeUploadPromise();

  DatasetUploadProgressStore.startUpload(datasetId, {
    uploadPromise,
    totalBytes: parquetBlob.size,
  });

  return await uploadPromise;
}
