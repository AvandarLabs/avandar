import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { AvaSupabase } from "$/db/supabase/AvaSupabase";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { getDatasetOriginalFileStoragePath } from "@/clients/storage/DatasetOriginalFileStorageClient/utils";
import {
  DIRECT_UPLOAD_MAX_BYTES,
  WORKSPACES_BUCKET_NAME,
} from "@/clients/storage/DatasetParquetStorageClient/utils";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";
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

async function _resumableOriginalFileUpload(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  file: File;
  objectPath: string;
}): Promise<void> {
  const { workspaceId, datasetId, file, objectPath } = options;

  const endpoint = `${AvaSupabase.getAPIURL()}/storage/v1/upload/resumable`;

  const tusHeaders = await _getTusHeaders();

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
    name: file.name,
    type: file.type,
    data: file,
    meta: {
      bucketName: WORKSPACES_BUCKET_NAME,
      objectName: objectPath,
      contentType: file.type,
      metadata: JSON.stringify({ datasetId, workspaceId }),
    },
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
 * Uploads the original file to Supabase storage as a single async operation.
 * This is a one-shot upload, it does not chunk the upload and does not
 * support resumability.
 */
async function _oneShotOriginalFileUpload(options: {
  file: File;
  objectPath: string;
}): Promise<void> {
  const { file, objectPath } = options;
  const { error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .upload(objectPath, file, {
      contentType: file.type,
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Uploads a dataset's original source file (e.g. the PDF a table was
 * extracted from) to Supabase storage, alongside the dataset's Parquet.
 *
 * This is a companion to the Parquet upload rather than a separate
 * user-visible operation: it does not report its own progress and does not
 * touch the source row's `isInCloudStorage` flag, which already describes
 * the Parquet upload's cloud-sync state. Callers that need to upload both
 * should sequence this alongside
 * `DatasetParquetStorageClient.startDatasetUpload`.
 *
 * @param options The options for uploading the dataset's original file.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset the original file belongs
 * to.
 * @param options.file The original file to upload.
 * @param options.fileExtension The extension to store the original under,
 * with or without a leading dot. Comes from
 * `getOriginalFileExtension(sourceType)`, never from the file name: the
 * storage path is addressed by source type, so deriving it from the file name
 * here would let a file called `contract.pdf.bak` upload to `.bak` while
 * `downloadOriginalFile` / `deleteOriginalFile` look for `.pdf`.
 */
async function uploadOriginalFile(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  file: File;
  fileExtension: string;
}): Promise<void> {
  const { workspaceId, datasetId, file, fileExtension } = options;

  const objectPath = getDatasetOriginalFileStoragePath({
    workspaceId,
    datasetId,
    fileExtension,
  });

  if (file.size > DIRECT_UPLOAD_MAX_BYTES) {
    await _resumableOriginalFileUpload({
      workspaceId,
      datasetId,
      file,
      objectPath,
    });
  } else {
    await _oneShotOriginalFileUpload({ file, objectPath });
  }
}

/**
 * Downloads a dataset's original source file from object storage.
 *
 * Most source types never retain an original file, so a missing object is
 * expected and returns `undefined` rather than throwing.
 *
 * @param options The options for downloading the dataset's original file.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to download the original
 * file for.
 * @param options.fileExtension The original file's extension, with or
 * without a leading dot.
 * @returns The original file's contents, or `undefined` if no original file
 * is retained for this dataset.
 */
async function downloadOriginalFile(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  fileExtension: string;
}): Promise<Blob | undefined> {
  const { workspaceId, datasetId, fileExtension } = options;

  const objectPath = getDatasetOriginalFileStoragePath({
    workspaceId,
    datasetId,
    fileExtension,
  });

  const { data: originalFileBlob, error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .download(objectPath);

  if (error || !originalFileBlob) {
    return undefined;
  }

  return originalFileBlob;
}

/**
 * Deletes a dataset's original source file from object storage.
 *
 * @param options The options for deleting the dataset's original file.
 * @param options.workspaceId The ID of the workspace the dataset belongs to.
 * @param options.datasetId The ID of the dataset to delete the original file
 * for.
 * @param options.fileExtension The original file's extension, with or
 * without a leading dot.
 */
async function deleteOriginalFile(options: {
  workspaceId: Workspace.Id;
  datasetId: DatasetId;
  fileExtension: string;
}): Promise<void> {
  const { workspaceId, datasetId, fileExtension } = options;

  const objectPath = getDatasetOriginalFileStoragePath({
    workspaceId,
    datasetId,
    fileExtension,
  });

  const { error } = await AvaSupabase.db()
    .storage.from(WORKSPACES_BUCKET_NAME)
    .remove([objectPath]);

  if (error) {
    throw new Error(error.message);
  }
}

export const DatasetOriginalFileStorageClient = {
  uploadOriginalFile,
  downloadOriginalFile,
  deleteOriginalFile,
};
