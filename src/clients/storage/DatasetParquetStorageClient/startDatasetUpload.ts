import { MIMEType } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ImportJobsManager } from "@/clients/datasets/ImportJobsManager";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { SourceDatasetClient } from "@/clients/datasets/SourceDatasetClient";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  getDatasetParquetStoragePath,
  WORKSPACES_BUCKET_NAME,
} from "@/clients/storage/DatasetParquetStorageClient/utils";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { notifyError } from "@/utils/notifications/notify";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { JobId } from "@/lib/utils/state/JobProgressStore/JobProgressStore";

/**
 * Tracks uploads already in flight, keyed by dataset id, so a second call for
 * the same dataset reuses the first call's promise instead of starting a
 * duplicate upload. Separate from `JobProgressStore`, which is keyed by an
 * opaque job id and knows nothing about datasets.
 */
const _uploadsInProgress = new Map<DatasetId, Promise<void>>();

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
  jobId: JobId;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob, jobId } = options;

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
    JobProgressStore.updateJob(jobId, {
      status: "determinate",
      label: t`Syncing dataset online`,
      current: progress.bytesUploaded,
      total: parquetBlob.size,
    });
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
  const { error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
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
  jobId: JobId;
}): Promise<void> {
  const { workspaceId, datasetId, parquetBlob, sourceType, jobId } = options;

  if (parquetBlob.size > DIRECT_UPLOAD_MAX_BYTES) {
    await _resumableParquetBlobUpload({
      workspaceId,
      datasetId,
      parquetBlob,
      jobId,
    });
  } else {
    await _oneShotParquetBlobUpload({
      workspaceId,
      datasetId,
      parquetBlob,
    });
  }

  JobProgressStore.updateJob(jobId, {
    status: "determinate",
    label: t`Syncing dataset online`,
    current: parquetBlob.size,
    total: parquetBlob.size,
  });

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

  const currentUpload = _uploadsInProgress.get(datasetId);
  if (currentUpload) {
    return await currentUpload;
  }

  // Wait for any in-flight background parquet transcoding to land before
  // pulling the parquet bytes out of IndexedDB. With the two-phase import
  // flow the user can save the dataset (which triggers this upload) before
  // the background parquet transcoding finishes; without this guard
  // `localDataset.parquetData` would still be the placeholder.
  const importJob = ImportJobsManager.getJob(datasetId);
  if (importJob && importJob.status === "running") {
    await ImportJobsManager.waitForCompletion(datasetId);
  }

  const localDataset = await LocalDatasetClient.getById({ id: datasetId });
  if (!localDataset) {
    throw new Error("Dataset is not available locally on this device.");
  }
  if (localDataset.parseStatus !== "ready" || !localDataset.parquetData) {
    throw new Error(
      `Dataset is not ready to upload (parseStatus: ${localDataset.parseStatus}).`,
    );
  }

  const parquetBlob = localDataset.parquetData;
  const jobId = JobProgressStore.startJob(t`Syncing dataset online`);

  const makeUploadPromise = async (): Promise<void> => {
    try {
      await _uploadDatasetToSupabase({
        ...options,
        parquetBlob,
        sourceType,
        jobId,
      });
      JobProgressStore.finishJob(jobId);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      JobProgressStore.failJob(jobId, errorMessage);
      notifyError({
        title: t`Unable to sync dataset online`,
        message: errorMessage,
      });
      throw error;
    } finally {
      _uploadsInProgress.delete(datasetId);
    }
  };

  const uploadPromise = makeUploadPromise();
  _uploadsInProgress.set(datasetId, uploadPromise);

  return await uploadPromise;
}
